import MicroEE from 'microee'

import { subscribe } from 'cozy-realtime'
import { KonnectorJobError } from '../../helpers/konnectors'

const JOBS_DOCTYPE = 'io.cozy.jobs'

const JOB_STATE_DONE = 'done'
const JOB_STATE_ERRORED = 'errored'

const DEFAULT_TIMER_DELAY = 8000

export class KonnectorJobWatcher {
  constructor(client, job, options = {}) {
    this.client = client
    this.job = job
    /**
     * Options
     *  expectedSuccessDelay: delay for login timer in ms
     */
    const { expectedSuccessDelay = DEFAULT_TIMER_DELAY } = options
    this.options = {
      ...options,
      expectedSuccessDelay
    }
    this.successTimer = null

    this._error = null
    this._succeed = false

    this.handleSuccess = this.handleSuccess.bind(this)
    this.handleError = this.handleError.bind(this)
    this.handleSuccessDelay = this.handleSuccessDelay.bind(this)
    this.disableSuccessTimer = this.disableSuccessTimer.bind(this)
  }

  handleError(error) {
    this.disableSuccessTimer()
    this._error = error
    this.emit('error', new KonnectorJobError(error))
  }

  handleSuccess() {
    this.disableSuccessTimer()
    if (this._error || this._succeed) return
    this._succeed = true
    this.emit('success', this.job)
  }

  handleSuccessDelay() {
    this.disableSuccessTimer()
    if (this._error || this._succeed) return

    this.emit('loginSuccess', this.job)
  }

  disableSuccessTimer() {
    if (this.successTimer) {
      clearTimeout(this.successTimer)
      this.successTimer = null
    }
  }

  enableSuccessTimer(time) {
    if (!this.successTimer) {
      this.successTimer = setTimeout(
        this.handleSuccessDelay,
        time || this.options.expectedSuccessDelay
      )
    }
  }

  async watch() {
    const jobSubscription = await subscribe(
      {
        // Token structure differs between web and mobile
        token:
          this.client.stackClient.token.token ||
          this.client.stackClient.token.accessToken,
        url: this.client.options.uri
      },
      JOBS_DOCTYPE,
      { docId: this.job._id }
    )

    jobSubscription.onUpdate(updatedJob => {
      if (this._succeed || this._error) return
      this.job = updatedJob
      const { state } = this.job
      if (state === JOB_STATE_DONE) this.handleSuccess(this.job)
      if (state === JOB_STATE_ERRORED) this.handleError(this.job.error)
    })

    this.enableSuccessTimer()
  }
}

MicroEE.mixin(KonnectorJobWatcher)

export default KonnectorJobWatcher
