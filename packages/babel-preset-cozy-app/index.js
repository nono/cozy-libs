'use strict'

const { declare } = require('@babel/helper-plugin-utils')
const browserslist = require('browserslist-config-cozy')
const { validate, isOfType } = require('./validate')
const merge = require('lodash/merge')

const mapValues = (obj, iter) => {
  const res = {}
  for (let k of Object.keys(obj)) {
    res[k] = iter(obj[k], k)
  }
  return res
}

const presetEnvBrowserOptions = {
  targets: browserslist,
  useBuiltIns: false
}

const presetEnvNodeOptions = {
  targets: {
    node: 8
  },
  // don't transform polyfills
  useBuiltIns: false
}

const optionConfigs = {
  node: {
    default: false,
    validator: isOfType('boolean')
  },
  react: {
    default: true,
    validator: isOfType('boolean')
  },
  transformRegenerator: {
    default: true,
    validator: isOfType('boolean')
  },
  presetEnv: {
    default: {},
    validator: isOfType('object')
  },
  transformRuntime: {
    default: {
      helpers: false,
      regenerator: true
    },
    validator: isOfType('object')
  }
}

const validators = mapValues(optionConfigs, x => x.validator)
const defaultOptions = mapValues(optionConfigs, x => x.default)

const mkConfig = (api, options) => {
  const presetOptions = merge(defaultOptions, options)

  try {
    validate(presetOptions, validators)
  } catch (e) {
    e.message = `babel-preset-cozy-app : Config validation error : ${e.message}`
    throw e
  }

  const {
    node,
    react,
    presetEnv,
    transformRuntime,
    transformRegenerator
  } = presetOptions

  const config = {}

  // Latest ECMAScript features on previous browsers versions
  const presetEnvOptions = {
    ...(node ? presetEnvNodeOptions : presetEnvBrowserOptions),
    ...presetEnv
  }

  config.presets = [
    [require.resolve('@babel/preset-env'), presetEnvOptions],
    // if (P)React app
    !node && react ? require.resolve('@babel/preset-react') : null
  ].filter(Boolean)

  const plugins = [
    // transform class attributes and methods with auto-binding
    // to the class instance and no constructor needed
    require.resolve('@babel/plugin-proposal-class-properties'),
    // Transform rest properties for object destructuring assignment
    // and spread properties for object literals
    // useBuiltIns to directly use Object.assign instead of using Babel extends
    [
      require.resolve('@babel/plugin-proposal-object-rest-spread'),
      {
        useBuiltIns: false
      }
    ]
  ]
  if (!node && transformRegenerator) {
    plugins.push(
      // Polyfills generator functions (for async/await usage)
      [require.resolve('@babel/plugin-transform-runtime'), transformRuntime]
    )
  }
  config.plugins = plugins
  return config
}

module.exports = declare(mkConfig)

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(mkConfig(null, {}), null, 2))
}
