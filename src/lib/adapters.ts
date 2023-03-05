import {BlocksData} from "./payload";
import { execute } from "@biscuit-auth/biscuit-wasm-support";

export type LibMarker = {
  position: {
    start: number;
    end: number;
  };
  ok: boolean;
};

export type CMMarker = {
  start: number;
  end: number;
  ok: boolean;
};

export const convertMarker = (marker: LibMarker) => {
  return {
    start: marker.position.start,
    end: marker.position.end,
    ok: marker.ok,
  };
};

export type LibError = {
  message: string;
  position: { start: number; end: number };
};

export type CMError = {
  message: string;
  severity: string;
  start: number;
  end: number;
};

export const convertError = (error: LibError) => {
  return {
    message: error.message,
    severity: "error",
    start: error.position.start,
    end: error.position.end,
  };
};

export const performExecute = (data: BlocksData, authorizer_code: string) => {
  let authorizer_world = [];
  let authorizer_result = null;
  const parseErrors = {
    blocks: [],
    authorizer: [],
  };
  const markers = {
    blocks: [],
    authorizer: [],
  };

  let validBlocks = data.getValidBlocks()

  console.log(validBlocks);

  const authorizerQuery = {
    token_blocks:
      validBlocks.length > 0
        ? validBlocks.map(({ code }) => code)
        : ["check if true"],
    authorizer_code,
    query: "",
    external_private_keys: validBlocks.map(
      ({ externalKey }) => externalKey
    ),
  };
  const authorizerResult = execute(authorizerQuery);
  console.debug({ authorizerQuery }); //, authorizerResult });
  console.debug({authorizerResult});
  authorizer_world = authorizerResult.Ok?.authorizer_world ?? [];
  authorizer_result = authorizerResult;
  markers.authorizer =
    authorizerResult.Ok?.authorizer_editor.markers.map(convertMarker) ?? [];
  parseErrors.authorizer =
    authorizerResult.Err?.authorizer.map(convertError) ?? [];

  markers.blocks =
    authorizerResult.Ok?.token_blocks.map(
      (b: { markers: Array<LibMarker> }) => b.markers.map(convertMarker)
    ) ?? [];
  parseErrors.blocks =
    authorizerResult.Err?.blocks.map((b: Array<LibError>) =>
      b.map(convertError)
    ) ?? [];

  return {
    parseErrors,
    authorizer_world,
    authorizer_result,
    markers
  }
}

export type Result<A, E> = {
  Ok?: A;
  Err?: E;
};

export type AuthorizerError = {
  authorizer: Array<LibError>;
  blocks: Array<Array<LibError>>;
};

export type Fact = {
  name: string;
  terms: Array<string>;
};

export type Check = {
  Block: {
    block_id: number;
    check_id: number;
    rule: string;
  };
};

export type LogicError = {
  Unauthorized?: {
    checks: Array<Check>;
    policy: { Allow?: number; Deny?: number };
  };
  NoMatchingPolicy?: {
    checks: Array<Check>;
  };
};

export type AuthorizerResult = {
  authorizer_editor: {
    markers: Array<LibMarker>;
  };
  authorizer_result: Result<
    number,
    {
      FailedLogic?: LogicError;
    }
  >;
  authorizer_world: Array<Fact>;
  token_blocks: Array<{ markers: Array<LibMarker> }>;
};

export type GeneratorError = {
  Biscuit?: "InternalError" | { Format?: { InvalidKeySize?: number } };
  Parse?: {
    blocks: Array<Array<LibError>>;
  };
};

export type AttenuactionError = {
  Biscuit?: { Format?: { InvalidKeySize?: number } };
  BlockParseErrors?: {
    blocks: Array<Array<LibError>>;
  };
};
