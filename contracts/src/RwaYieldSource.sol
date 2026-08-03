// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Sepolia RWA coupon source. Emits verifiable CouponPaid events for Attestcoin.
contract RwaYieldSource is Ownable {
    struct Source {
        string name;
        string tranche;
        uint16 riskBps; // higher = riskier
        bool active;
    }

    mapping(uint256 => Source) public sources;
    uint256 public nextSourceId = 1;
    uint256 public nextCouponId = 1;

    /// @dev CouponPaid(uint256 sourceId, uint256 amount, uint256 couponId, string tranche)
    /// Indexed: sourceId. Data: amount, couponId, tranche (abi-encoded dynamic).
    /// For USC decoding we use a simpler signature matching indexed + data layout.
    event CouponPaid(
        uint256 indexed sourceId,
        uint256 indexed couponId,
        uint256 amount,
        bytes32 trancheHash,
        string metadata
    );

    event SourceRegistered(uint256 indexed sourceId, string name, string tranche, uint16 riskBps);
    event SourceStatusUpdated(uint256 indexed sourceId, bool active);

    constructor() Ownable(msg.sender) {
        _registerSource("Trade Finance Invoice Pool", "senior", 200);
        _registerSource("T-Bill Proxy Desk", "treasury", 50);
        _registerSource("Emerging Market Receivables", "mezz", 450);
    }

    function registerSource(string calldata name, string calldata tranche, uint16 riskBps)
        external
        onlyOwner
        returns (uint256 sourceId)
    {
        return _registerSource(name, tranche, riskBps);
    }

    function setSourceActive(uint256 sourceId, bool active) external onlyOwner {
        require(sources[sourceId].riskBps != 0 || bytes(sources[sourceId].name).length > 0, "unknown");
        sources[sourceId].active = active;
        emit SourceStatusUpdated(sourceId, active);
    }

    /// @notice Post a real-world coupon/settlement that Attestcoin can later prove on Creditcoin.
    function postCoupon(uint256 sourceId, uint256 amount, string calldata metadata)
        external
        onlyOwner
        returns (uint256 couponId)
    {
        Source memory s = sources[sourceId];
        require(s.active, "inactive source");
        require(amount > 0, "zero amount");

        couponId = nextCouponId++;
        emit CouponPaid(sourceId, couponId, amount, keccak256(bytes(s.tranche)), metadata);
    }

    function _registerSource(string memory name, string memory tranche, uint16 riskBps)
        internal
        returns (uint256 sourceId)
    {
        sourceId = nextSourceId++;
        sources[sourceId] =
            Source({name: name, tranche: tranche, riskBps: riskBps, active: true});
        emit SourceRegistered(sourceId, name, tranche, riskBps);
    }
}
