import parser from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { program } from "@babel/types";

const empty_func = `
function empty_step(context) {
    return undefined;
}
`;

const workflow_code = `
const df = require("durable-functions");

module.exports = df.orchestrator(function*(context) {
  const x = yield context.df.callActivity("F1");
  const y = yield context.df.callActivity("F2", x);
  const z = yield context.df.callActivity("F3", y);
  return yield context.df.callActivity("F4", z);
});
`;

const wf_ast = parser.parse(workflow_code, {
  sourceType: "script",
  plugins: ["jsx", "flow"],
});

const state = {
  stack: [],
  functions: []
};

var df_handler;

const DurableFunctionVisitor = {
  VariableDeclaration(path) {
    console.log('push');
    state.stack.push(path);
  },
  Identifier(path) {
    console.log('<<<' + path.node.name)
  },
  YieldExpression: {
    exit(path) {
      path.replaceWith(t.callExpression(path.node.argument.callee, path.node.argument.arguments))
      var funcBody = [];
      var returnVars = [];
      var statement = state.stack.shift();
      
      while (statement != undefined) {
        if (t.isVariableDeclaration(statement.node)) {
          statement.node.declarations.forEach(dec => {
            returnVars.push(dec.id.name);
          })
        }
        funcBody.push(statement.node);
        statement = state.stack.shift();
      }

      const returnObjectProperties = [];
      returnVars.forEach(returnVar => {
        var objProperty = t.objectProperty(t.stringLiteral(returnVar), t.identifier(returnVar));
        returnObjectProperties.push(objProperty);
      })

      const ret = t.objectExpression(returnObjectProperties);
      funcBody.push(t.returnStatement(ret));
      const prog = t.program([t.functionDeclaration(t.identifier('continuation_' + state.functions.length), [], t.blockStatement(funcBody))]);
      state.functions.push(prog);
      console.log('exit');
    }
  },
};

const GlobalScriptVisitor = {
  CallExpression(path) {
    // console.log(path);
    if (path.node.callee.name === 'require' && path.node.arguments.pop().value === 'durable-functions') {
      df_handler = path.parent.id.name;
      console.log('Durable Functions handler is "' + df_handler + '"')
      return;
    }

    if (t.isMemberExpression(path.node.callee)
      && t.isIdentifier(path.node.callee.object)
      && path.node.callee.object.name === df_handler
      && t.isIdentifier(path.node.callee.property)
      && path.node.callee.property.name === 'orchestrator') {
      path.traverse(DurableFunctionVisitor)
    }
  }
}

const RemoveYields = {
  YieldExpression(path) {
  }
}

traverse.default(wf_ast, GlobalScriptVisitor);

console.log(df_handler);

const output = generate.default(wf_ast, {}, "");

console.log('========================');
console.log(output.code);
console.log('========================');

state.functions.forEach(elem => {
  // console.log(elem)
  console.log('---')
  const out = generate.default(elem, {}, "");
  console.log(out.code);
});


