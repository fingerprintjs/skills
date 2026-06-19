// Identify at the moment of a sensitive action and send event_id to the backend.
import { Component } from '@angular/core'
import { FingerprintService } from '@fingerprint/angular'

@Component({
  selector: 'app-login',
  template: '<!-- ...form... -->',
})
export class LoginComponent {
  username = ''
  password = ''

  constructor(private fingerprintService: FingerprintService) {}

  async onSubmit(): Promise<void> {
    // getVisitorData() identifies on demand and returns { visitor_id, event_id }
    const data = await this.fingerprintService.getVisitorData()

    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send the event_id (single-use, server-verifiable) — not the visitor_id.
      body: JSON.stringify({
        username: this.username,
        password: this.password,
        eventId: data.event_id,
      }),
    })
  }
}
