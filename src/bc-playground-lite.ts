import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./bc-datalog-editor.js";
import "./bc-switch";
import "./bc-key-details";
import "./bc-export";
import { initialize } from "./wasm.js";
import { generate_keypair } from "@biscuit-auth/biscuit-wasm-support";
import {CMError, CMMarker, performExecute} from "./lib/adapters";
import { token_from_query } from "./lib/token";
import {Configuration, ConfigurationEntry} from "./playground-configuration";
import {BlockData, BlocksData, PayloadHandler} from "./lib/payload";

/**
 * A fully tunable datalog biscuit playground
 */
@customElement("bc-playground-lite")
export class BCDatalogPlaygroundLite extends LitElement {

  @property() blocks = false;
  @property() facts = false;
  @property() token = false;
  @property() third_party = false;
  @property() custom_external = false;
  @property() regenerate = false;
  @property() public_key = false;
  @property() result = false;
  @property() add_block = false;
  @property() authorizer = false;

  @state() started = false;
  @state() data : BlocksData;
  @state() configuration : Configuration;

  static styles = css`
    
 

    .block {
      margin-bottom: 20px;
    }

    .blockHeader {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .blockHeader .close {
      font-size: 1.5em;
      line-height: 10px;
      cursor: pointer;
      padding: 5px;
    }

    code {
      border: 1px rgba(128, 128, 128, 0.4) solid;
      display: flex;
      flex-direction: column;
      text-wrap: none;
      overflow-wrap: anywhere;
      max-width: fit-content;
    }

    .content code {
      user-select: all;
      max-width: 100%;
      padding: 10px;
      box-sizing: border-box;
      font-size: 1.2em;
    }

    .button {
      padding: 5px;
      box-sizing: border-box;
      margin-top: -5px;
    }

    .add_block {
      font-size: 1.05em;
      font-weight: bold;
      width: 100%;
    }

    .key_details {
      margin-top: -4px;
    }
    
    code.token {
      font-size: 1em;
    }
  `;

  constructor() {
    super();

    const code = this.querySelector(".authorizer")?.textContent ?? "";
    this.data = new BlocksData(code)

    const blockChildren = this.querySelectorAll(".block");
    Array.from(blockChildren)
      .map((b, i) => {
        const code = b.textContent ?? "";
        let externalKey = null;
        if (i > 0) {
          externalKey = b.getAttribute("privateKey");
        }
        return new BlockData(code, externalKey);
      })
      .filter(({ code }, i) => i === 0 || code !== "")
      .forEach((block) => {
        this.data.addBlock(block)
      });

    this.configuration = new Configuration();

  }

  firstUpdated() {
    initialize().then(() => {
      if (this.data.getBlock(0)?.externalKey === null) {
        const keypair = generate_keypair();
        this.data.getBlock(0)?.setExternalKey(keypair.private_key);
      }
      this.started = true;
    });
  }

  // Triggered when attributes change
  attributeChangedCallback(name: string, oldval: string | null, newval: string | null) {
    if (typeof newval === 'string') {
      this.configuration.set(name, newval === "true")
    }
  }

  // A new block is added to the chain
  addBlock() {
    this.data.addBlock(new BlockData("", null))
    this.requestUpdate("data")
  }

  // A block is deleted from the chain
  deleteBlock(blockId: number) {
    console.debug("deleting block")
    this.data.deleteBlock(blockId)
    this.requestUpdate("data")
  }

  // The content of the block has changed
  onUpdatedBlock(blockId: number, e: { detail: { code: string } }) {
    const previousKey = this.data.getBlock(blockId)?.externalKey ?? null;
    this.data.setBlock(blockId, new BlockData(e.detail.code, previousKey));
    this.requestUpdate("data")
  }

  // The authorizer code has been modified
  onUpdatedCode(e: { detail: { code: string } }) {
    this.data.authorizerCode = e.detail.code
    this.requestUpdate("data")
  }

  // React to the toggle between 1st and 3rd party block
  onBlockSwitch(blockId: number, state: boolean) {
    if (state) {
      // 3rd party
      console.debug("3rd party")
      if (this.data.getBlock(blockId)?.externalKey === null) {
        // uninitialized 3rd party block
        const keypair = generate_keypair();
        this.data.getBlock(blockId)?.setExternalKey(keypair.private_key)
      }
    } else {
      // attenuate
      console.debug("attenuate")
      this.data.getBlock(blockId)?.setExternalKey(null)
    }
    this.requestUpdate("data")
  }

  // A 3rd party block has been updated
  onBlockKeyUpdate(blockId: number, e: CustomEvent) {
    this.data.getBlock(blockId)?.setExternalKey(e.detail.data)
    this.requestUpdate("data");
  }

  // Can be called from the outside of the component
  askForExport() {
    if (this.shadowRoot !== null) {
      const exporter = this.shadowRoot.querySelector("#export_button")
      if (exporter) {
        // @ts-ignore
        exporter.performExport(true)
      }
    }
  }

  //Export button pressed
  public onExport(e: CustomEvent) {
    const event = new CustomEvent("export", {
      detail: e.detail,
      bubbles: true,
      composed: true
    })
    this.dispatchEvent(event)

  }

  // Regenerate the private key
  onRegeneratePrivateKey() {
    const keypair = generate_keypair();
    this.data.getBlock(0)?.setExternalKey(keypair.private_key)
    this.requestUpdate("data")
  }

  // Main rendering method
  render() {
    if (this.started) {
      // Filter empty blocks but keep the authority even if empty

      let {
        parseErrors,
        authorizer_world,
        authorizer_result,
        markers
      } = performExecute(this.data, this.data.authorizerCode);

    // Display the authorizer world
    const factContent = html`<p>Facts</p>
    <bc-authorizer-content
        .content=${authorizer_world}
    ></bc-authorizer-content>`;

    const facts = this.configuration.get(ConfigurationEntry.facts) ? factContent : html``;
    const token = this.configuration.get(ConfigurationEntry.token) ? this.renderToken() : ``;

    const result = this.configuration.get(ConfigurationEntry.result) ? html`      <p>Result</p>
    <bc-authorizer-result .content=${authorizer_result}>
    </bc-authorizer-result>` : ``;

    const authorizer = this.configuration.get(ConfigurationEntry.authorizer) ? html`${this.renderAuthorizer(markers.authorizer, parseErrors.authorizer)}` : ``;

    return html`
      <style>
        #export_button {
          display: ${this.configuration.get(ConfigurationEntry.export) ? "block" : "none"};
          margin-bottom: 30px;
        }
      </style>
      ${this.renderBlocks(markers.blocks, parseErrors.blocks)}
      ${authorizer}
      ${result}
      ${facts}
      ${token}
    `;
  }
}

  // Render a single block
  renderBlock(
    blockId: number,
    code: string,
    markers: Array<CMMarker>,
    errors: Array<CMError>
  ) {

    // Display the toggle switch between 1st and 3rd party mode
    const switchContent = this.configuration.get(ConfigurationEntry.third_party) && blockId !== 0 ? html`| 
    <bc-switch 
      @bc-switch:update="${(e: CustomEvent) => this.onBlockSwitch(blockId, e.detail.state)}" 
      leftLabel="1st Party Block" 
      rightLabel="3rd Party Block" 
      ratio="1"
      checked="${this.data.getBlock(blockId)?.externalKey !== null ? "true" : "false"}"></bc-switch>
    ` : ``;

    // Display the public key copy button, the private key input
    let blockDetails;

    // Blocks
    if (this.configuration.get(ConfigurationEntry.third_party) && blockId !== 0 &&
      this.data.isBlockThirdParty(blockId)) {
      blockDetails = html`<bc-key-details
        class="key_details"
        @bc-key-details:update="${(e: CustomEvent) => this.onBlockKeyUpdate(blockId, e)}"
        .allowsCustomKey=${this.configuration.get(ConfigurationEntry.custom_external)} 
        .displayPublicKey=${true}
        privateKey="${this.data.getBlock(blockId)?.externalKey}"></bc-key-details>`;
    }

    // Authority
    if ( blockId === 0 && this.data.getBlock(0)?.externalKey) {
      blockDetails = html`<bc-key-details
        class="key_details"
        @bc-key-details:update="${(e: CustomEvent) => this.onBlockKeyUpdate(0, e)}"
        @bc-key-details:regenerate="${this.onRegeneratePrivateKey}"
        allowsCustomKey="${this.configuration.get(ConfigurationEntry.custom_external)}"
        allowsRegenerate="${this.configuration.get(ConfigurationEntry.regenerate)}"
        displayPublicKey="${this.configuration.get(ConfigurationEntry.public_key)}"
        withoutAlgorithm="true"
        privateKey="${this.data.getBlock(0)?.externalKey}"></bc-key-details>`;
    }

    const close = blockId !== 0 && this.configuration.get(ConfigurationEntry.add_block) ?
      html`<div @click="${() => this.deleteBlock(blockId)}" class="close">&times;</div>` : '';

    return html`
      <div class="block">
        <div class="blockHeader">
          ${close}
          <div>${blockId == 0 ? "Authority block" : "Block " + blockId}</div>
          ${switchContent}
          ${blockDetails}
        </div>

        <bc-datalog-editor
          datalog=${code}
          .markers=${markers ?? []}
          .parseErrors=${errors ?? []}
          @bc-datalog-editor:update=${(e: { detail: { code: string } }) =>
            this.onUpdatedBlock(blockId, e)}
          }
        />
      </div>`;
  }

  // Render all block if needed
  renderBlocks(markers: Array<Array<CMMarker>>, errors: Array<Array<CMError>>) {

    if (!this.configuration.get(ConfigurationEntry.blocks)) return;

    const addBlock = this.configuration.get(ConfigurationEntry.add_block) ? html`<button class="button add_block" @click=${this.addBlock}>+ Add block</button>` : ``;

    return html`
      ${this.data.blocks.map(({ code }, id) => {
        return this.renderBlock(id, code, markers[id], errors[id]);
      })}
      ${addBlock}
    `;
  }

  // Render the authorizer results and editor
  renderAuthorizer(markers: Array<CMMarker>, parseErrors: Array<CMError>) {

    const authorizer_title = this.configuration.get(ConfigurationEntry.blocks) ? html`<p>Authorizer</p>` : ``;

    return html`${authorizer_title}
      <bc-authorizer-editor
        code=${this.data.authorizerCode}
        .markers=${markers ?? []}
        .parseErrors=${parseErrors ?? []}
        @bc-authorizer-editor:update=${this.onUpdatedCode}
        }
      >
      </bc-authorizer-editor>`;
  }

  renderToken() : TemplateResult {

    if (this.data.blocks.length === 0) {
        return html``
    }

    let nonEmptyBlocks = this.data.getValidBlocks();

    const query = {
      token_blocks: nonEmptyBlocks.map(({ code }) => code),
      private_key: this.data.getBlock(0)?.externalKey ?? "",
      external_private_keys: nonEmptyBlocks.slice(1).map(
        ({ externalKey }) => externalKey
      ),
    };

    let {token} = token_from_query(query);

    return html`<p>Token</p>
    <div class="content">
    <code class="token">${token}</code>
    </div>`
  }
}
