import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const input = ['src/index.js']
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
