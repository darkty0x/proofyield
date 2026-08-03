import { JsonRpcProvider } from "ethers";
import type { Env } from "./config.js";

export type AttestProofResult = {
  success: boolean;
  chainKey: number;
  headerNumber?: number;
  txBytes?: string;
  merkleProof?: unknown;
  continuityProof?: unknown;
  verified?: boolean;
  error?: string;
  mock?: boolean;
};

/**
 * Build Attestcoin inclusion proof for a Sepolia tx and optionally verify on CC3.
 * In demo mode returns a structured mock proof without hitting the prover.
 */
export async function proveSepoliaTx(
  env: Env,
  sepoliaTxHash: string,
  blockNumber: number,
): Promise<AttestProofResult> {
  const chainKey = env.SEPOLIA_CHAIN_KEY;

  if (env.PROOFYIELD_MODE === "demo") {
    return {
      success: true,
      chainKey,
      headerNumber: blockNumber,
      verified: true,
      mock: true,
      txBytes: "0x",
    };
  }

  try {
    // Dynamic import so demo mode works even if SDK peer quirks appear.
    const usc = await import("@gluwa/usc-sdk");
    const creditcoinProvider = new JsonRpcProvider(env.CREDITCOIN_RPC_URL);
    const sourceProvider = new JsonRpcProvider(env.SEPOLIA_RPC_URL);

    const proofBuilder = new usc.proofProvider.service.ProofBuilder(
      chainKey,
      env.ATTESTCOIN_PROVER_URL,
      8_000,
    );

    const tx = await sourceProvider.getTransaction(sepoliaTxHash);
    const height = tx?.blockNumber ?? blockNumber;
    await proofBuilder.waitUntilHeightAttested(chainKey, height);

    const result = await proofBuilder.getProof(sepoliaTxHash);
    if (!result.success || !result.data) {
      return {
        success: false,
        chainKey,
        error: String(result.error ?? "proof generation failed"),
      };
    }

    const prover = new usc.blockProver.PrecompileBlockProver(creditcoinProvider);
    const { headerNumber, txBytes, merkleProof, continuityProof } = result.data;
    const verified = await prover.verifySingle(
      chainKey,
      headerNumber,
      txBytes,
      merkleProof,
      continuityProof,
    );

    return {
      success: true,
      chainKey,
      headerNumber,
      txBytes,
      merkleProof,
      continuityProof,
      verified: Boolean(verified),
      mock: false,
    };
  } catch (err) {
    return {
      success: false,
      chainKey,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
