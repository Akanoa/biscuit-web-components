interface PayloadDefinition {
  authorizer_code: string,
  blocks: Array<{code: string, externalKey: string | null}>
}

export class BlockData {
  code : string;
  externalKey: string | null

  constructor(code: string, external_key: string | null) {
    this.code = code
    this.externalKey = external_key
  }

  setExternalKey(key: string | null) {
    this.externalKey = key
  }
}

export class BlocksData {
  private authorizer_code: string;
  blocks : Array<BlockData>

  constructor(authorizer_code: string = "") {
    this.authorizer_code = authorizer_code;
    this.blocks = []
  }

  addBlock(bloc: BlockData) {
    this.blocks.push(bloc)
  }

  deleteBlock(blockId: number) {
    this.blocks.splice(blockId, 1)
  }

  set authorizerCode(value: string) {
    this.authorizer_code = value
  }

  get authorizerCode() : string {
    return this.authorizer_code
  }

  getBlock(blockId: number) : BlockData | null {
    return (blockId < this.blocks.length) ? this.blocks[blockId] : null
  }

  setBlock(blockId: number, data: BlockData) {
    this.blocks.splice(blockId, 1, data)
  }

  getValidBlocks() : Array<BlockData> {

    if (this.blocks.length === 0) {
      return []
    }

    let validBlocks = this.blocks.slice(1).filter((x) => x.code !== "");
    validBlocks = [this.blocks[0], ...validBlocks]
    return validBlocks
  }

  isBlockThirdParty(blockId: number) : boolean {
    return (this.blocks[blockId]?.externalKey ?? null) !== null
  }
}


export class PayloadHandler {

  static fromHash(hash: string) : BlocksData {

    const data : PayloadDefinition = JSON.parse(atob(decodeURIComponent(hash)), function(k, v) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.assign(Object.create(null), v);
      }
      return v;
    });

     let payloadData = new BlocksData(data.authorizer_code);
     data.blocks.forEach(({code, externalKey}) => {
        payloadData.addBlock(new BlockData(code, externalKey))
     })

    return payloadData
  }

  static toHash(data: BlocksData) : string {
    return encodeURIComponent(btoa(JSON.stringify(data)))
  }
}