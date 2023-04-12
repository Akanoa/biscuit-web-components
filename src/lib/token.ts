import { GeneratorError, LibError, Result } from "./adapters";
import { generate_token, parse_token } from "@biscuit-auth/biscuit-wasm-support";

interface Query {
  token_blocks: Array<string | null>,
  private_key: string | null,
  external_private_keys: Array<string|null>,
  seed: string | null
}

interface TokenResult {
  token: string,
  revocation_ids: [string],
  result: Result<ParseTokenResult, GeneratorError>
}

interface ParseTokenResult {
  token: string,
  revocation_ids: [string]
}

export function token_from_query(query: Query) : TokenResult {
  let result: Result<ParseTokenResult, GeneratorError>;

  try {
    let token = generate_token(query)
    let parsed = parse_token({data: token});

    let revocation_ids = parsed.revocation_ids ?? null;

    result = {
      Ok: {token, revocation_ids},
    };
  } catch (error) {
    result = { Err: error as GeneratorError };
  }

  const blocksWithErrors: Array<number> = [];
  (result.Err?.Parse?.blocks ?? []).forEach(
    (errors: Array<LibError>, bId: number) => {
      if (errors.length > 0) {
        blocksWithErrors.push(bId);
      }
    }
  );

  let errorMessage = "Please correct the datalog input";

  if (result.Err?.Biscuit === "InternalError") {
    errorMessage = "Please provide an authority block";
  } else if (
    typeof result.Err?.Biscuit === "object" &&
    result.Err?.Biscuit?.Format?.InvalidKeySize !== undefined
  ) {
    errorMessage = "Please enter (or generate) a valid private key";
  } else if (blocksWithErrors.length > 0) {
    const blockList = blocksWithErrors
      .map((bId) => (bId === 0 ? "authority" : bId.toString()))
      .join(", ");
    errorMessage =
      "Please correct the datalog input on the following blocks: " +
      blockList;
  }

  const token = result.Ok?.token ?? errorMessage;
  const revocation_ids = result.Ok?.revocation_ids ?? [] as unknown as [string];

  return {
    token,
    result,
    revocation_ids
  }
}