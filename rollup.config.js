import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'src/index.js',
    plugins: [nodeResolve(), commonjs()],
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        exports: 'named'
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        exports: 'named'
      }
    ]
  }
]
