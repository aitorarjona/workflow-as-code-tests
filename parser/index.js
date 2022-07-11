import parser from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

function visit_node(node) {
  console.log(node);
  if (node.type == "VariableDeclaration") {
    node.declarations.array.forEach((delcaration) => {

    })
  }
}

function process_orchestrator_function(parent_node) {
  console.log(parent_node);

  var block_statement = parent_node.body;
  if (block_statement.type == "BlockStatement") {
    for (var i = 0; i < block_statement.body.length; i++) {
      visit_node(block_statement.body[i]);
    }
  }
}

// var a = t.functionDeclaration(t.identifier("potato"), [t.identifier("arg1")], t.blockStatement([t.emptyStatement()]));
// console.log(a);

const empty_func = `
function empty_step(context) {
    return undefined;
}
`;

const workflow_code = `
function* my_workflow_function(context) {
    const x = yield context.df.callActivity("F1");
    const y = yield context.df.callActivity("F2", x);
    const z = yield context.df.callActivity("F3", y);
    return    yield context.df.callActivity("F4", z);
}
`;

const workflow_code_name = "my_workflow_function";

const wf_ast = parser.parse(workflow_code, {
  sourceType: "script",
  plugins: ["jsx", "flow"],
});

const YieldExp = {
  FunctionDeclaration(path) {
    process_orchestrator_function(path.node);
  },
};

traverse.default(wf_ast, MyVisitor);

// const output = generate.default(
//     wf_ast,
//   {
//     /* options */
//   },
//   ""
// );

// console.log(output.code.trim());

// var wf_func_node = undefined;

// for (var i = 0; i < workflow_node.program.body.length; i++) {
//   var node = workflow_node.program.body[i];

//   if (node.type == "ExpressionStatement" && node.expression.type == "AssignmentExpression") {
//     var expression = node.expression;
//     if (expression.right.type == "CallExpression" && expression.right.callee.type == "MemberExpression") {
//       var callee = expression.right.callee;
//       if (callee.object.name == "df" && callee.property.name == "orchestrator") {
//         wf_func_node = expression.right.arguments.pop();
//         break;
//       }
//     }
//   }
// }
