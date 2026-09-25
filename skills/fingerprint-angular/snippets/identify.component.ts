// Identify at the moment of a sensitive action, rather than on init.
import { Component } from '@angular/core'
import { FingerprintService } from '@fingerprint/angular'

@Component({
  selector: 'app-login',
  template: '<!-- ...form whose submit calls onSubmit... -->',
})
export class LoginComponent {
  constructor(private fingerprintService: FingerprintService) {}

  async onSubmit(): Promise<void> {
    // getVisitorData() identifies on demand and returns { visitor_id, event_id }. Each call is a
    // billable identification event, so call it on the action you care about.
    // It rejects when the agent is blocked, offline or times out — don't block the UI on it.
    const { visitor_id, event_id } = await this.fingerprintService.getVisitorData()
    console.log('visitor_id:', visitor_id, 'event_id:', event_id)

    // Identification alone is a hint, not a trust decision: anything from the browser can be
    // forged. If this app has a backend, that is where the single-use `event_id` goes — send it
    // alongside the request and verify it there with the Server API (`fingerprint-node` /
    // `fingerprint-python`), then act on the verified result. Never send `visitor_id` as proof.
  }
}
