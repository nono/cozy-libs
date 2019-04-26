import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Welcome from './steps/Welcome'
import SelectServer from './steps/SelectServer'
import { withClient } from 'cozy-client'

const STEP_WELCOME = 'STEP_WELCOME'
const STEP_EXISTING_SERVER = 'STEP_EXISTING_SERVER'

import { register } from './client-compat'

class Authentication extends Component {
  constructor(props) {
    super(props)

    this.state = {
      currentStepIndex: 0,
      generalError: null,
      fetching: false
    }

    this.steps = [STEP_WELCOME]
    this.connectToServer = this.connectToServer.bind(this)
  }

  componentWillUnmount() {
    this.unmounted = true
  }

  nextStep() {
    this.setState(prevState => ({
      currentStepIndex: ++prevState.currentStepIndex
    }))
  }

  onAbort() {
    this.setState({ currentStepIndex: 0 })
  }

  setupSteps() {
    this.steps = [STEP_WELCOME, STEP_EXISTING_SERVER]
    this.nextStep()
  }

  async connectToServer(url) {
    const { onComplete, onException } = this.props
    try {
      this.setState({ generalError: null, fetching: true })
      const cozyClient = this.props.client
      const { client: clientInfo, token } = await register(cozyClient, url)

      const destructuredToken = {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        tokenType: token.tokenType
      }
      await cozyClient.login({ url, token })
      await onComplete({
        url,
        token: destructuredToken,
        clientInfo
      })
    } catch (err) {
      this.setState({ generalError: err })
      onException(err, {
        tentativeUrl: url,
        onboardingStep: 'connecting to server'
      })
    } finally {
      if (!this.unmounted) {
        this.setState({ fetching: false })
      }
    }
  }

  render() {
    const { onException, appIcon, appTitle } = this.props
    const { currentStepIndex, generalError, fetching } = this.state
    const currentStep = this.steps[currentStepIndex]

    switch (currentStep) {
      case STEP_WELCOME:
        return (
          <Welcome
            selectServer={() => this.setupSteps()}
            register={() => this.setupSteps()}
            allowRegistration={false}
            appIcon={appIcon}
            appTitle={appTitle}
          />
        )
      case STEP_EXISTING_SERVER:
        return (
          <SelectServer
            nextStep={this.connectToServer}
            previousStep={() => this.onAbort()}
            externalError={generalError}
            fetching={fetching}
            onException={onException}
          />
        )
      default:
        return null
    }
  }
}

Authentication.propTypes = {
  onComplete: PropTypes.func.isRequired,
  onException: PropTypes.func.isRequired,
  router: PropTypes.object,
  appIcon: PropTypes.string.isRequired,
  client: PropTypes.object.isRequired
}

Authentication.contextTypes = {
  client: PropTypes.object
}

Authentication.defaultProps = {
  components: {
    Welcome,
    SelectServer
  }
}

export default withClient(Authentication)
