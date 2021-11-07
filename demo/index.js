import '/src/bc-token-editor.js';
import '/src/bc-token-content.js';
import '/src/bc-authorizer-editor.js';
import '/src/bc-authorizer-result.js';
import '/src/bc-authorizer-content.js';
import init, {execute} from "@geal/biscuit-component-wasm"


var state = {
  token_blocks: [],
  authorizer_code: "",
  query: "",
}

async function setup() {
  await init();

  document
    .querySelector('bc-token-editor')
    .addEventListener('bc-token-editor:update', ({ detail: blocks }) => {
      var token_blocks = [];

      for(let block of blocks.blocks) {
        token_blocks.push(block.code);
      }

      state.token_blocks = token_blocks;

      update();
     });

  document
    .querySelector('bc-verifier-editor')
    .addEventListener('bc-verifier-editor:update', ({ detail: code }) => {
      state.authorizer_code = code.code;

      update();
     });

  for(const child of Array.from(document.querySelector('bc-token-editor').children)) {
    state.token_blocks.push(child.innerText);
  }

  const child = document
    .querySelector('bc-verifier-editor').children[0];
  if(child != undefined) {
    state.authorizer_code = child.innerText;
  }

  update();
}

function update() {
      var result = execute(state);

      document
        .querySelector('bc-token-content')
         .content = result.token_content;

      var tokenErrors = [];
      var tokenMarkers = [];
      for(let editor of result.token_blocks) {
        var parseErrors = [];

        for(let error of editor.errors) {
          parseErrors.push({
            message: error.message,
            severity: "error",
            from: CodeMirror.Pos(error.position.line_start, error.position.column_start),
            to: CodeMirror.Pos(error.position.line_end, error.position.column_end),
          });
        }
        tokenErrors.push(parseErrors);

        var markers = [];
        for(let marker of editor.markers) {
          var css;
          if(marker.ok) {
            css = "background: #c1f1c1;";
          } else {
            css = "background: #ffa2a2;";
          }

          markers.push({
            from: {
              line: marker.position.line_start,
              ch: marker.position.column_start,
            },
            to: {
              line: marker.position.line_end,
              ch: marker.position.column_end,
            },
            options: { css: css},
          });
        }
        tokenMarkers.push(markers);
      }
      document
        .querySelector('bc-token-editor')
        .parseErrors = tokenErrors;
      document
        .querySelector('bc-token-editor')
        .markers = tokenMarkers;

      if(result.authorizer_editor != null) {
        var parseErrors = [];

        for(let error of result.authorizer_editor.errors) {
          parseErrors.push({
            message: error.message,
            severity: "error",
            from: CodeMirror.Pos(error.position.line_start, error.position.column_start),
            to: CodeMirror.Pos(error.position.line_end, error.position.column_end),
          });
        }

        document
          .querySelector('bc-verifier-editor')
          .parseErrors = parseErrors;

        var markers = [];
        for(let marker of result.authorizer_editor.markers) {
          var css;
          if(marker.ok) {
            css = "background: #c1f1c1;";
          } else {
            css = "background: #ffa2a2;";
          }

          markers.push({
            from: {
              line: marker.position.line_start,
              ch: marker.position.column_start,
            },
            to: {
              line: marker.position.line_end,
              ch: marker.position.column_end,
            },
            options: { css: css},
          });
        }
        document
          .querySelector('bc-verifier-editor')
          .markers = markers;
      }

      document
        .querySelector('bc-verifier-result')
         .content = result.authorizer_result;

      document
        .querySelector('bc-verifier-content')
         .content = result.authorizer_world;
}

setup();
