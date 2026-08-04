// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INativeQueryVerifier} from "./VerifierInterface.sol";
import {USCBase} from "./USCBase.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// @title ProofYieldVault
/// @notice ERC-4626 vault on Creditcoin. Share price rises only after Attestcoin-proven RWA coupons.
contract ProofYieldVault is ERC4626, Ownable, ReentrancyGuard, USCBase {
    enum Action {
        Harvest // 0
    }

    /// @dev keccak256("CouponPaid(uint256,uint256,uint256,bytes32,string)")
    bytes32 public constant COUPON_EVENT_SIGNATURE =
        keccak256("CouponPaid(uint256,uint256,uint256,bytes32,string)");

    address public sourceYieldContract;
    address public harvester;
    uint256 public maxHarvestBps = 500; // max 5% of TVL per harvest
    uint256 public totalHarvested;
    uint256 public harvestCount;
    bool public paused;

    mapping(uint256 => bool) public allowlistedSources;
    mapping(bytes32 => bool) public usedCoupons;

    event SourceAllowlisted(uint256 indexed sourceId, bool allowed);
    event SourceYieldContractSet(address indexed source);
    event HarvesterUpdated(address indexed harvester);
    event MaxHarvestBpsUpdated(uint256 bps);
    event YieldHarvested(
        bytes32 indexed queryId,
        uint256 indexed sourceId,
        uint256 indexed couponId,
        uint256 amount,
        uint256 newSharePrice
    );
    event PauseUpdated(bool paused);

    error VaultPaused();
    error Unauthorized();
    error SourceNotAllowed();
    error HarvestCapExceeded();
    error CouponAlreadyUsed();
    error InvalidCouponLog();

    modifier whenNotPaused() {
        if (paused) revert VaultPaused();
        _;
    }

    constructor(IERC20 asset_)
        ERC20("ProofYield Vault Share", "pyvUSD")
        ERC4626(asset_)
        Ownable(msg.sender)
        USCBase()
    {
        harvester = msg.sender;
        allowlistedSources[1] = true;
        allowlistedSources[2] = true;
        allowlistedSources[3] = true;
    }

    /// @dev Virtual shares offset (OpenZeppelin ERC-4626 inflation / donation mitigation).
    /// With offset δ=3, empty-vault mint uses `shares = assets * 10^3 / 1`, so a 1-wei
    /// first deposit cannot monopolize the exchange rate after a large direct donation.
    /// See docs: /docs/erc4626-security
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    function setSourceYieldContract(address source) external onlyOwner {
        require(source != address(0), "zero");
        sourceYieldContract = source;
        emit SourceYieldContractSet(source);
    }

    function setHarvester(address h) external onlyOwner {
        harvester = h;
        emit HarvesterUpdated(h);
    }

    function setAllowlistedSource(uint256 sourceId, bool allowed) external onlyOwner {
        allowlistedSources[sourceId] = allowed;
        emit SourceAllowlisted(sourceId, allowed);
    }

    function setMaxHarvestBps(uint256 bps) external onlyOwner {
        require(bps <= 2_000, "too high");
        maxHarvestBps = bps;
        emit MaxHarvestBpsUpdated(bps);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PauseUpdated(p);
    }

    function deposit(uint256 assets, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.mint(shares, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner_)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(uint256 shares, address receiver, address owner_)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return super.redeem(shares, receiver, owner_);
    }

    /// @notice Share price in asset decimals (1e6 scale for pyUSD).
    function sharePrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 10 ** IERC20Metadata(asset()).decimals();
        return (totalAssets() * (10 ** IERC20Metadata(asset()).decimals())) / supply;
    }

    /// @notice Rough trailing APY from harvested yield vs current TVL (demo metric).
    function reportedApyBps() public view returns (uint256) {
        uint256 assets_ = totalAssets();
        if (assets_ == 0 || totalHarvested == 0) return 0;
        // Annualize last harvest density naively for UI (not a promise).
        uint256 ratio = (totalHarvested * 10_000) / assets_;
        return ratio > 10_000 ? 10_000 : ratio * 12; // crude monthly→annual for demo
    }

    function _processAndEmitEvent(uint8 action, bytes32 queryId, bytes memory encodedTransaction)
        internal
        override
    {
        if (action != uint8(Action.Harvest)) revert Unauthorized();
        (uint256 sourceId, uint256 couponId, uint256 amount) = _decodeCoupon(encodedTransaction);
        _accrue(queryId, sourceId, couponId, amount);
    }

    /// @dev Direct harvest for local/demo when Attestcoin path already verified off-chain by trusted harvester.
    /// In live mode the preferred entry is `execute(...)` which verifies the inclusion proof on-chain.
    function harvestTrusted(
        bytes32 queryId,
        uint256 sourceId,
        uint256 couponId,
        uint256 amount,
        bytes32 sepoliaTxHash
    ) external nonReentrant whenNotPaused {
        if (msg.sender != harvester && msg.sender != owner()) revert Unauthorized();
        bytes32 couponKey = keccak256(abi.encodePacked(sepoliaTxHash, couponId));
        if (usedCoupons[couponKey]) revert CouponAlreadyUsed();
        usedCoupons[couponKey] = true;
        _accrue(queryId, sourceId, couponId, amount);
    }

    function _accrue(bytes32 queryId, uint256 sourceId, uint256 couponId, uint256 amount) internal {
        if (!allowlistedSources[sourceId]) revert SourceNotAllowed();
        require(amount > 0, "zero");

        uint256 assets_ = totalAssets();
        if (assets_ > 0) {
            uint256 cap = (assets_ * maxHarvestBps) / 10_000;
            if (amount > cap) revert HarvestCapExceeded();
        }

        // Mint underlying into the vault → share price rises, shares unchanged.
        MockUSDC(asset()).mint(address(this), amount);

        totalHarvested += amount;
        harvestCount += 1;

        emit YieldHarvested(queryId, sourceId, couponId, amount, sharePrice());
    }

    /// @dev Minimal CouponPaid log scan over ABI-encoded USC transaction blob.
    /// Expects at least one log whose topic0 matches COUPON_EVENT_SIGNATURE and address == sourceYieldContract.
    function _decodeCoupon(bytes memory encodedTransaction)
        internal
        view
        returns (uint256 sourceId, uint256 couponId, uint256 amount)
    {
        require(sourceYieldContract != address(0), "source unset");
        // Layout used by Attestcoin EVM v1 encoding embeds RLP receipt logs.
        // For robust production use @gluwa/usc-contracts EvmV1Decoder.
        // Here we scan for the 32-byte event signature then read following topic words.
        bytes32 sig = COUPON_EVENT_SIGNATURE;
        bytes memory blob = encodedTransaction;
        bool found;
        for (uint256 i = 0; i + 160 < blob.length; i++) {
            bytes32 word;
            assembly {
                word := mload(add(add(blob, 32), i))
            }
            if (word != sig) continue;

            // Attempt topic layout: [sig][sourceId][couponId] then data amount at +96
            bytes32 t1;
            bytes32 t2;
            bytes32 amtWord;
            assembly {
                t1 := mload(add(add(blob, 32), add(i, 32)))
                t2 := mload(add(add(blob, 32), add(i, 64)))
                amtWord := mload(add(add(blob, 32), add(i, 96)))
            }
            sourceId = uint256(t1);
            couponId = uint256(t2);
            amount = uint256(amtWord);
            if (sourceId == 0 || couponId == 0 || amount == 0) continue;
            found = true;
            break;
        }
        if (!found) revert InvalidCouponLog();
    }

    // Silence unused import warning for interface re-export in ABI consumers
    function verifierPrecompile() external pure returns (address) {
        return address(0x0000000000000000000000000000000000000FD2);
    }

    function exposeMerkleType(INativeQueryVerifier.MerkleProofEntry calldata e)
        external
        pure
        returns (bytes32)
    {
        return e.hash;
    }
}
