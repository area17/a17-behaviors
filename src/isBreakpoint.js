import getCurrentMediaQuery from '@area17/a17-helpers/src/utility/getCurrentMediaQuery';

const isBreakpoint = function (breakpoint, breakpoints) {
  // Doc: https://code.area17.com/a17/a17-helpers/wikis/isBreakpoint

  // bail if no breakpoint is passed
  if (!breakpoint) {
    console.error('You need to pass a breakpoint name!')
    return false
  }

  // we only want to look for a specific modifier and make sure it is at the end of the string
  const pattern = /\+$|\-$/
  const regExp = new RegExp(pattern)

  // bps must be in order from smallest to largest
  let bps = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

  // override the breakpoints if the option is set on the global A17 object
  if (window.A17 && window.A17.breakpoints) {
    if (Array.isArray(window.A17.breakpoints)) {
      bps = window.A17.breakpoints
    } else {
      console.warn('A17.breakpoints should be an array. Using defaults.')
    }
  }

  // override the breakpoints if a set of breakpoints is passed through as a parameter (added for A17-behaviors to allow usage with no globals)
  if (breakpoints) {
    if (Array.isArray(breakpoints)) {
      bps = breakpoints;
    } else {
      console.warn('isBreakpoint breakpoints should be an array. Using defaults.')
    }
  }

  // store current breakpoint in use
  const currentBp = getCurrentMediaQuery()

  // store the index of the current breakpoint
  const currentBpIndex = bps.indexOf(currentBp)

  // check to see if bp has a + or - modifier
  const hasModifier = regExp.exec(breakpoint)

  // store modifier value
  const modifier = hasModifier ? hasModifier[0] : false

  // store the trimmed breakpoint name if a modifier exists, if not, store the full queried breakpoint name
  const bpName = hasModifier ? breakpoint.slice(0, -1) : breakpoint

  // store the index of the queried breakpoint
  const bpIndex = bps.indexOf(bpName)

  // let people know if the breakpoint name is unrecognized
  if (bpIndex < 0) {
    console.warn(
      'Unrecognized breakpoint. Supported breakpoints are: ' + bps.join(', ')
    )
    return false
  }

  // compare the modifier with the index of the current breakpoint in the bps array with the index of the queried breakpoint.
  // if no modifier is set, compare the queried breakpoint name with the current breakpoint name
  if (
    (modifier === '+' && currentBpIndex >= bpIndex) ||
    (modifier === '-' && currentBpIndex <= bpIndex) ||
    (!modifier && breakpoint === currentBp)
  ) {
    return true
  }

  // the current breakpoint isn’t the one you’re looking for
  return false
}

export default isBreakpoint
