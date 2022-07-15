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

// const workflow_code = `
// const df = require("durable-functions");

// module.exports = df.orchestrator(function*(context) {
//   const x = yield context.df.callActivity("F1");
//   const y = yield context.df.callActivity("F2", x);
//   const z = yield context.df.callActivity("F3", y);
//   return yield context.df.callActivity("F4", z);
// });
// `;

// const workflow_code = `
// const df = require("durable-functions");

// module.exports = df.orchestrator(function*(context) {
//   const hello = yield context.df.callActivity("echo", "Hello");
//   context.log("Result is " + hello);
//   const world = yield context.df.callActivity("echo", "World!");
//   context.log("Result is " + world);

//   const result = hello + " " + world;
//   return result;
// });
// `;

// const workflow_code = `
// const df = require("durable-functions");

// module.exports = df.orchestrator(function* (context) {
//   const parallelTasks = [];

//   // Get a list of N work items to process in parallel.
//   const workBatch = yield context.df.callActivity("F1");
//   for (let i = 0; i < workBatch.length; i++) {
//     parallelTasks.push(context.df.callActivity("F2", workBatch[i]));
//   }

//   yield context.df.Task.all(parallelTasks);

//   // Aggregate all N outputs and send the result to F3.
//   const sum = parallelTasks.reduce((prev, curr) => prev + curr, 0);
//   yield context.df.callActivity("F3", sum);
// });
// `;

const workflow_code = `
const df = require("durable-functions");

module.exports = df.orchestrator(function* (context) {
  const fate = yield context.df.callActivity("try_luck");

  if (fate) {
      context.log('lucky!');
      const outcome = yield context.df.callActivity("sleep", 1);
  } else {
      context.log('too bad...');
      const outcome = yield context.df.callActivity("sleep", 10);
  }

  return outcome;
});
`;

const wf_ast = parser.parse(workflow_code, {
  sourceType: "script",
  plugins: ["jsx", "flow"],
});

const state = {
  statements: [],
  stack: [],
  scope: [],
  functions: [],
  vars: new Set(),
  refs: [],
};

var df_handler;

function commit(path) {
  console.log('>>>>> commit');
  var funcBody = [];
  var returnVars = [];
  var statement = state.statements.shift();
  var isReturn = false;

  while (statement != undefined) {
    if (t.isReturnStatement(statement.node)) {
      isReturn = true;
    }
    if (t.isVariableDeclaration(statement.node)) {
      statement.node.declarations.forEach(dec => {
        returnVars.push(dec.id.name);
      })
    }
    funcBody.push(statement.node);
    statement = state.statements.shift();
  }

  if (!isReturn) {
    const returnObjectProperties = [];
    returnVars.forEach(returnVar => {
      var objProperty = t.objectProperty(t.stringLiteral(returnVar), t.identifier(returnVar));
      returnObjectProperties.push(objProperty);
    })

    const ret = t.objectExpression(returnObjectProperties);
    funcBody.push(t.returnStatement(ret));
  }

  const args = [];
  state.refs.forEach((name) => {
    args.push(t.identifier(name));
  })
  const contFunc = t.functionDeclaration(t.identifier('continuation_' + state.functions.length), args, t.blockStatement(funcBody))
  state.refs = [];

  const prog = t.program([contFunc]);
  state.functions.push(prog);
}

const DurableFunctionVisitor = {
  VariableDeclaration(path) {
    console.log('VariableDeclaration');
    state.statements.push(path);
  },
  ReturnStatement(path) {
    console.log('ReturnStatement');
    state.statements.push(path);
  },
  ForStatement: {
    enter(path) {
      console.log('ForStatement<enter>');
      state.scope.push(path);
      state.stack.push(state.statements);
      state.statements = [];
    },
    exit(path) {
      console.log('ForStatement<exit>');
      state.statements = state.stack.pop();
      state.statements.push(state.scope.pop());
    }
  },
  ExpressionStatement(path) {
    state.statements.push(path);
  },
  VariableDeclarator: {
    exit(path) {
      console.log('VariableDeclarator<exit>');
      if (t.isIdentifier(path.node.id)) {
        state.vars.add(path.node.id.name)
      }
    }
  },
  Identifier(path) {
    console.log('Identifier');
    if (state.vars.has(path.node.name)) {
      state.refs.push(path.node.name);
    }
  },
  YieldExpression: {
    exit(path) {
      console.log('YieldExpression<exit>')
      path.replaceWith(t.callExpression(path.node.argument.callee, path.node.argument.arguments))
      commit(path);
    }
  },
  FunctionExpression: {
    exit(path) {
      console.log('FunctionExpression<exit>')
      commit(path);
    }
  }
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


