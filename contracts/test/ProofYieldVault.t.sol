// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ProofYieldVault} from "../src/ProofYieldVault.sol";
import {RwaYieldSource} from "../src/RwaYieldSource.sol";

contract ProofYieldVaultFlowTest is Test {
    MockUSDC asset;
    ProofYieldVault vault;
    address alice = address(0xA11CE);

    function setUp() public {
        asset = new MockUSDC();
        asset.mint(alice, 100_000e6);
        vault = new ProofYieldVault(asset);
        asset.setMinter(address(vault), true);
        vault.setHarvester(address(this));
        vault.setAllowlistedSource(1, true);
    }

    function testDepositAndHarvestRaisesSharePrice() public {
        vm.startPrank(alice);
        asset.approve(address(vault), 10_000e6);
        uint256 shares = vault.deposit(10_000e6, alice);
        vm.stopPrank();

        uint256 priceBefore = vault.sharePrice();
        // With decimalsOffset=3, empty vault mints assets * 10^3 shares.
        assertEq(shares, 10_000e6 * 1_000);

        vault.harvestTrusted(keccak256("q1"), 1, 1, 100e6, keccak256("tx1"));

        uint256 priceAfter = vault.sharePrice();
        assertGt(priceAfter, priceBefore);
        assertEq(vault.totalHarvested(), 100e6);
        assertEq(vault.harvestCount(), 1);
    }

    /// @dev Classic ERC-4626 inflation / donation: attacker seeds tiny deposit then donates.
    /// Victim must still receive non-zero shares under OZ virtual offset (δ=3).
    function testDonationAttackVictimStillGetsShares() public {
        address attacker = address(0xBEEF);
        address victim = address(0xCAFE);
        asset.mint(attacker, 1_000_000e6);
        asset.mint(victim, 10_000e6);

        // Attacker deposits 1 unit (1e-6 pyUSD).
        vm.startPrank(attacker);
        asset.approve(address(vault), type(uint256).max);
        vault.deposit(1, attacker);
        // Donate 100_000 pyUSD directly (not via deposit) to inflate assets.
        asset.transfer(address(vault), 100_000e6);
        vm.stopPrank();

        vm.startPrank(victim);
        asset.approve(address(vault), type(uint256).max);
        uint256 victimShares = vault.deposit(10_000e6, victim);
        vm.stopPrank();

        assertGt(victimShares, 0, "victim rounded to zero shares (inflation)");
        // Victim should redeem roughly their deposit (minus donation dilution), not zero.
        uint256 assetsOut = vault.previewRedeem(victimShares);
        assertGt(assetsOut, 9_000e6);
    }

    function testHarvestCap() public {
        vm.startPrank(alice);
        asset.approve(address(vault), 10_000e6);
        vault.deposit(10_000e6, alice);
        vm.stopPrank();

        vm.expectRevert(ProofYieldVault.HarvestCapExceeded.selector);
        vault.harvestTrusted(keccak256("q2"), 1, 2, 501e6, keccak256("tx2"));
    }

    function testRejectUnknownSource() public {
        vm.startPrank(alice);
        asset.approve(address(vault), 1_000e6);
        vault.deposit(1_000e6, alice);
        vm.stopPrank();

        vm.expectRevert(ProofYieldVault.SourceNotAllowed.selector);
        vault.harvestTrusted(keccak256("q3"), 99, 1, 10e6, keccak256("tx3"));
    }

    function testRwaSourceEmitsCoupon() public {
        RwaYieldSource src = new RwaYieldSource();
        vm.expectEmit(true, true, false, true);
        emit RwaYieldSource.CouponPaid(1, 1, 250e6, keccak256(bytes("senior")), "invoice-42");
        src.postCoupon(1, 250e6, "invoice-42");
    }
}
