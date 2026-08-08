// babel-import-meta-fix.js
// Metro transformer: добавляем плагин-заглушку import.meta поверх стандартного expo-pipeline.
const babel = require('@babel/core');

module.exports = {
  transform({ src, filename, options }) {
    const result = babel.transform(src, {
      filename,
      presets: [require('babel-preset-expo')],
      plugins: [
        function rewriteImportMeta() {
          return {
            name: 'rewrite-import-meta',
            visitor: {
              MemberExpression(path) {
                const obj = path.node.object;
                if (obj && obj.type === 'MetaProperty' && obj.meta && obj.meta.name === 'import') {
                  const prop = path.node.property;
                  if (prop && prop.name === 'env') {
                    path.replaceWith(
                      babel.types.objectExpression([
                        babel.types.objectProperty(babel.types.identifier('MODE'), babel.types.stringLiteral('production')),
                        babel.types.objectProperty(babel.types.identifier('DEV'), babel.types.booleanLiteral(false)),
                        babel.types.objectProperty(babel.types.identifier('PROD'), babel.types.booleanLiteral(true)),
                      ]),
                    );
                  } else if (prop && prop.name === 'url') {
                    path.replaceWith(babel.types.stringLiteral(''));
                  }
                }
              },
              MetaProperty(path) {
                path.replaceWith(babel.types.objectExpression([]));
              },
            },
          };
        },
      ],
      sourceType: 'module',
      ast: false,
      babelrc: false,
      configFile: false,
    });
    return { code: result.code || src };
  },
};
