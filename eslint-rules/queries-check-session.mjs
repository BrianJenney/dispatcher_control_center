function isDefineQuery(node) {
  return node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "defineQuery";
}

const typeOnly = new Set(["TSTypeAliasDeclaration", "TSInterfaceDeclaration"]);

const queriesCheckSession = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      unguardedRead:
        "Export every read in src/server/queries as defineQuery(access, read) so the session is checked before any data loads.",
    },
  },
  create(context) {
    function report(node) {
      context.report({ node, messageId: "unguardedRead" });
    }
    return {
      ExportNamedDeclaration(node) {
        if (node.exportKind === "type") return;
        const { declaration } = node;
        if (!declaration) {
          node.specifiers.filter((specifier) => specifier.exportKind !== "type").forEach(report);
          return;
        }
        if (typeOnly.has(declaration.type)) return;
        if (declaration.type !== "VariableDeclaration") {
          report(declaration);
          return;
        }
        declaration.declarations.filter((declarator) => !isDefineQuery(declarator.init)).forEach(report);
      },
      ExportDefaultDeclaration: report,
      ExportAllDeclaration(node) {
        if (node.exportKind !== "type") report(node);
      },
    };
  },
};

export default queriesCheckSession;
