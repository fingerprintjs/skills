// Identify at the moment of a sensitive action, rather than on init.
import { Component } from '@angular/core'
import { FingerprintService } from '@fingerprint/angular'

@Component({
  selector: 'app-identify',
  template: '<!-- ...form whose submit calls onSubmit... -->',
})
export class IdentifyComponent {
  constructor(private fingerprintService: FingerprintService) {}

  async onSubmit(): Promise<void> {
    try {
      // getVisitorData() identifies on demand and returns { visitor_id, event_id }. Each call is a
      // billable identification event, so call it on the action you care about.
      const { visitor_id, event_id } = await this.fingerprintService.getVisitorData()
      console.log('visitor_id:', visitor_id, 'event_id:', event_id)
    } catch (error) {
      // Ad blockers, offline, timeouts. Don't block the UI on identification; let the action continue.
      console.warn('Fingerprint failed:', error)
    }

    // Identification alone is a hint, not a trust decision: anything from the browser can be
    // forged. If this app has a backend, that is where the single-use `event_id` goes — send it
    // alongside the request and verify it there with the Server API (`fingerprint-node` /
    // `fingerprint-python`), then act on the verified result. Never send `visitor_id` as proof.
  }
}
