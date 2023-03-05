import { html, LitElement, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  get_public_key
} from "@biscuit-auth/biscuit-wasm-support";
import { initialize } from "./wasm";
import { dispatchCustomEvent } from "./lib/events";

@customElement("bc-key-details")
class ThirdPartyBlockDetails extends LitElement {
  @property() privateKey = "";
  @property() allowsCustomKey = false;
  @property() displayPublicKey = false;
  @property() withoutAlgorithm = false;
  @property() allowsRegenerate = false;
  @state() _privateKey = "";
  @state() _publicKey = "";
  @state() private started = false;

  static styles = css`
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .button {
      padding: 5px;
      box-sizing: border-box;
      margin-top: -5px;
      font-weight: bold;
      min-width: 120px;
    }
    
    .key_container {
      display: flex;
      flex-direction: row;
    }
    
    .key_container .symbol {
      line-height: 20px;
    }

    .key_container .key {
      margin-top: -9px;
      margin-left: 2px;
      user-select: text;
      -moz-user-select: text;
      padding: 10px;
      box-sizing: border-box;
    }

    .key_container .key[contenteditable] {
      outline: 0 solid transparent;
      font-size: 0.9em;
      overflow-wrap: anywhere;
    }
  `

  constructor() {
    super();
  }

  firstUpdated() {
    initialize().then(() => {
      this._publicKey = get_public_key(this._privateKey)
    });
  }

  onKeyChange(e: InputEvent) {
    if (e.target !== null ) {
        const data = (e.target as HTMLInputElement).innerText;
        this._privateKey = data;
        this._publicKey = get_public_key(this._privateKey)
        dispatchCustomEvent(this, "update", {data})
    }
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {

    if (name === "privatekey" && value !== null && value.length) {
      this._privateKey = value;
    }

    if (name === "allowscustomkey") {
      this.allowsCustomKey = value === "true";
    }

    if (name === "withoutalgorithm") {
      this.withoutAlgorithm = value === "true"
    }

    if (name === "allowsregenerate") {
      this.allowsRegenerate = value === "true"
    }

    if (name === "displaypublickey") {
      this.displayPublicKey = value === "true"
    }
  }

  onCopyButton() {
    const data = this.withoutAlgorithm ? `${this._publicKey}` : `ed25519/${this._publicKey}`;
    navigator.clipboard.writeText(data).then(r => {
      console.debug("copied")
      if (this.shadowRoot !== null) {
        const copyButton = this.shadowRoot.querySelector("#copy-button") as HTMLButtonElement;
        if (copyButton !== null) {
          copyButton.textContent = "Copied!"
          setTimeout(() => {
              copyButton.textContent = "Copy Public Key"
            }, 2000)
        }
      }
    })
  }

  onRegeneratePrivateKey() {
    dispatchCustomEvent(this, "regenerate")
  }

  protected render() {

      const customExternalContent = html`<div class="key_container">
        <div class="symbol">🔑</div>
        <div role="textbox" contenteditable="true" class="key"
             @blur="${(e: InputEvent) => this.onKeyChange(e)}"
        >${this._privateKey}</div>
      </div>`

    const customExternalKey = this.allowsCustomKey ? customExternalContent : '';

    const regenerate = this.allowsRegenerate ? html`<button class="button" @click="${this.onRegeneratePrivateKey}">Regenerate Private Key</button>` : ``;
    const publicKey = this.displayPublicKey ? html`<button id="copy-button" class="button" @click="${this.onCopyButton}" type="button">Copy Public Key</button>` : ``;

    return html`
      <div class="container">
        
        ${publicKey}
        ${regenerate}
        ${customExternalKey}
      </div>
    `;
  }
}