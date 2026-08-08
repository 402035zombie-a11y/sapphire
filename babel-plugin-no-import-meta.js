// babel-plugin-no-import-meta.js
// Заменяет import.meta.env / import.meta.url на безопасные заглушки,
// чтобы web-бандл грузился как обычный <script> (без type=module).
module.exports = function noImportMeta() {
  return {
    name: 'no-import-meta',
    visitor: {
      MemberExpression(path) {
        const obj = path.node.object;
        if (obj && obj.type === 'MetaProperty' && obj.meta && obj.meta.name === 'import') {
          const prop = path.node.property;
          if (prop && prop.name === 'env') {
            path.replaceWith(
              this.types.objectExpression([
                this.types.objectProperty(this.types.identifier('MODE'), this.types.stringLiteral('production')),
                this.types.objectProperty(this.types.identifier('DEV'), this.types.booleanLiteral(false)),
                this.types.objectProperty(this.types.identifier('PROD'), this.types.booleanLiteral(true)),
              ]),
            );
          } else if (prop && prop.name === 'url') {
            path.replaceWith(this.types.stringLiteral(''));
          }
        }
      },
      MetaProperty(path) {
        path.replaceWith(this.types.objectExpression([]));
      },
    },
  };
};
