'use strict';

/**
 * Online Consultation booking widget.
 *
 * Flow: pick a date + slot -> patient details -> pay over UPI (QR / UPI ID)
 * and upload a screenshot + UTR -> the backend checks the screenshot and, if
 * nothing is clearly wrong, confirms straight away and emails the Google Meet
 * link. See google-apps-script/README.md for the backend setup runbook.
 */
const OC_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzc1Sc7-baufLOoLDvD5JSgLPbcLXYTz66htgIj8HzQ1cP7lkK-rbe61TG8sjXfoxDs/exec',

  UPI_ID: 'samriyah1794-2@oksbi',
  UPI_PAYEE_NAME: 'Best Dental Solutions',
  // Optional: path to the clinic's own QR image (e.g. from the bank / PhonePe
  // Business / GPay for Business app). When set, it's shown instead of the
  // generated QR code.
  UPI_QR_IMAGE: '',

  CONSULTATION_FEE_INR: 299,

  // Must match CONFIG.WEEKLY_HOURS / MAX_DAYS_AHEAD in google-apps-script/Code.gs.
  ALLOWED_DAYS: [0, 1, 3, 5], // Sun, Mon, Wed, Fri
  // Consultation window in IST, as minutes after midnight: 1:00 PM – 4:00 PM.
  // Slots outside it are hidden even if the backend returns them.
  SLOT_WINDOW_START_MINUTES: 13 * 60,
  SLOT_WINDOW_END_MINUTES: 16 * 60,
  MAX_DAYS_AHEAD: 14,

  MAX_UPLOAD_BYTES: 10 * 1024 * 1024, // raw file the patient picks
  SCREENSHOT_MAX_DIMENSION: 1600      // longest side after client-side resize
};

document.addEventListener('DOMContentLoaded', function () {
  const root = document.querySelector('[data-oc-root]');
  if (!root) return;

  /* ---------- Tab switching (In-Clinic vs Online Consultation) ---------- */

  const tabButtons = document.querySelectorAll('[data-appointment-tab]');
  const tabPanels = document.querySelectorAll('[data-appointment-panel]');

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = btn.getAttribute('data-appointment-tab');

      tabButtons.forEach(function (b) {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      tabPanels.forEach(function (panel) {
        const isActive = panel.getAttribute('data-appointment-panel') === target;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
      });
    });
  });

  /* ---------- Widget elements ---------- */

  const stepsEl = root.querySelectorAll('[data-oc-steps] [data-oc-step]');
  const panels = root.querySelectorAll('[data-oc-panel]');
  const dateGrid = root.querySelector('[data-oc-date-grid]');
  const slotsStatus = root.querySelector('[data-oc-slots-status]');
  const slotsGrid = root.querySelector('[data-oc-slots-grid]');
  const selectedSlotEls = root.querySelectorAll('[data-oc-selected-slot]');
  const feeLine = root.querySelector('[data-oc-fee-line]');
  const patientForm = root.querySelector('#oc-patient-form');
  const paymentForm = root.querySelector('#oc-payment-form');
  const backButtons = root.querySelectorAll('[data-oc-back]');
  const errorEl = root.querySelector('[data-oc-error]');
  const confirmDatetime = root.querySelector('[data-oc-confirm-datetime]');
  const confirmId = root.querySelector('[data-oc-confirm-id]');
  const meetLinkEl = root.querySelector('[data-oc-meet-link]');

  const upiQrEl = root.querySelector('[data-oc-upi-qr]');
  const upiAmountEl = root.querySelector('[data-oc-upi-amount]');
  const upiIdEl = root.querySelector('[data-oc-upi-id]');
  const copyUpiBtn = root.querySelector('[data-oc-copy-upi]');
  const copyLabel = root.querySelector('[data-oc-copy-label]');
  const upiAppLink = root.querySelector('[data-oc-upi-app-link]');
  const screenshotInput = root.querySelector('[data-oc-screenshot]');
  const screenshotPreview = root.querySelector('[data-oc-screenshot-preview]');

  const feeDisplay = '₹' + OC_CONFIG.CONSULTATION_FEE_INR;

  if (feeLine) {
    feeLine.textContent = 'Consultation fee: ' + feeDisplay + ' (paid via UPI on the next step)';
  }

  const state = {
    date: null,
    slot: null, // { start, end, label }
    patient: null, // { name, phone, email, reason }
    screenshot: null, // { base64, mimeType }
    qrRendered: false
  };

  /* ---------- Step navigation ---------- */

  function goToStep(n) {
    panels.forEach(function (panel) {
      panel.classList.toggle('active', Number(panel.getAttribute('data-oc-panel')) === n);
    });
    stepsEl.forEach(function (step) {
      step.classList.toggle('active', Number(step.getAttribute('data-oc-step')) <= n);
    });
    hideError();
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  backButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = Number(btn.getAttribute('data-oc-back'));
      goToStep(target);
    });
  });

  /* ---------- Date + slot selection ---------- */

  renderDateOptions();

  /**
   * Shows only the days online consultations run on (rather than a native
   * date picker, which can't disable specific weekdays).
   */
  function renderDateOptions() {
    if (!dateGrid) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= OC_CONFIG.MAX_DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (OC_CONFIG.ALLOWED_DAYS.indexOf(d.getDay()) === -1) continue;

      const value = formatDateValue(d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'oc-date-btn';
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML =
        '<span class="oc-date-weekday">' + d.toLocaleDateString('en-IN', { weekday: 'short' }) + '</span>' +
        '<span class="oc-date-day">' + d.getDate() + '</span>' +
        '<span class="oc-date-month">' + d.toLocaleDateString('en-IN', { month: 'short' }) + '</span>';

      btn.addEventListener('click', function () {
        dateGrid.querySelectorAll('.oc-date-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        state.date = value;
        state.slot = null;
        fetchSlots(state.date);
      });

      dateGrid.appendChild(btn);
    }
  }

  function formatDateValue(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function fetchSlots(date) {
    if (!slotsGrid || !slotsStatus) return;
    slotsGrid.innerHTML = '';
    slotsStatus.textContent = 'Loading available times…';

    const url = OC_CONFIG.APPS_SCRIPT_URL + '?action=getSlots&date=' + encodeURIComponent(date);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (date !== state.date) return; // a different date was clicked meanwhile
        if (data.error) {
          slotsStatus.textContent = 'Could not load slots. Please try another date.';
          return;
        }
        renderSlots(data.slots || []);
      })
      .catch(function () {
        slotsStatus.textContent = 'Could not reach the booking service. Please check your connection and try again.';
      });
  }

  /**
   * Slot times come from the backend as IST ISO strings like
   * "2026-10-05T13:30:00+05:30"; reads the clock time straight off the string
   * so the check doesn't depend on the patient's own time zone.
   */
  function minutesOfDay(isoString) {
    const match = /T(\d{2}):(\d{2})/.exec(isoString || '');
    return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  }

  function isWithinConsultationWindow(slot) {
    const start = minutesOfDay(slot.start);
    const end = minutesOfDay(slot.end);
    return start >= OC_CONFIG.SLOT_WINDOW_START_MINUTES && end > start &&
      end <= OC_CONFIG.SLOT_WINDOW_END_MINUTES;
  }

  function renderSlots(allSlots) {
    slotsGrid.innerHTML = '';

    const slots = allSlots.filter(isWithinConsultationWindow);

    if (!slots.length) {
      slotsStatus.textContent = 'No available slots on this date. Please try another date.';
      return;
    }

    slotsStatus.textContent = 'Select a time slot:';

    slots.forEach(function (slot) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'oc-slot-btn';
      btn.textContent = slot.label;
      btn.addEventListener('click', function () {
        state.slot = slot;
        slotsGrid.querySelectorAll('.oc-slot-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedSlotEls.forEach(function (el) {
          el.textContent = 'Selected: ' + formatDateLabel(state.date) + ', ' + slot.label;
        });
        goToStep(2);
      });
      slotsGrid.appendChild(btn);
    });
  }

  function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ---------- Patient details ---------- */

  if (patientForm) {
    patientForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      if (!state.slot) {
        showError('Please choose a date and time first.');
        goToStep(1);
        return;
      }

      if (!patientForm.checkValidity()) {
        patientForm.reportValidity();
        return;
      }

      state.patient = {
        name: document.getElementById('oc-name').value.trim(),
        phone: document.getElementById('oc-phone').value.trim(),
        email: document.getElementById('oc-email').value.trim(),
        reason: document.getElementById('oc-reason').value.trim()
      };

      renderUpiPayment();
      goToStep(3);
    });
  }

  /* ---------- UPI payment ---------- */

  function buildUpiUri() {
    const params = [
      // Keep "@" literal — some UPI apps reject a percent-encoded "%40" here.
      'pa=' + encodeURIComponent(OC_CONFIG.UPI_ID).replace('%40', '@'),
      'pn=' + encodeURIComponent(OC_CONFIG.UPI_PAYEE_NAME),
      'am=' + OC_CONFIG.CONSULTATION_FEE_INR.toFixed(2),
      'cu=INR',
      'tn=' + encodeURIComponent('Online Consultation')
    ];
    return 'upi://pay?' + params.join('&');
  }

  function renderUpiPayment() {
    if (upiAmountEl) upiAmountEl.textContent = feeDisplay;
    if (upiIdEl) upiIdEl.textContent = OC_CONFIG.UPI_ID;

    const upiUri = buildUpiUri();

    // Deep links into UPI apps only make sense on a phone.
    if (upiAppLink && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      upiAppLink.href = upiUri;
      upiAppLink.hidden = false;
    }

    if (!upiQrEl || state.qrRendered) return;

    if (OC_CONFIG.UPI_QR_IMAGE) {
      const img = document.createElement('img');
      img.src = OC_CONFIG.UPI_QR_IMAGE;
      img.alt = 'UPI QR code for ' + OC_CONFIG.UPI_PAYEE_NAME;
      img.width = 200;
      img.height = 200;
      upiQrEl.appendChild(img);
      state.qrRendered = true;
    } else if (typeof QRCode !== 'undefined') {
      new QRCode(upiQrEl, {
        text: upiUri,
        width: 200,
        height: 200,
        correctLevel: QRCode.CorrectLevel.M
      });
      state.qrRendered = true;
    } else {
      upiQrEl.textContent = 'QR code could not be loaded — please pay using the UPI ID.';
    }
  }

  if (copyUpiBtn) {
    copyUpiBtn.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(OC_CONFIG.UPI_ID).then(function () {
        if (!copyLabel) return;
        copyLabel.textContent = 'Copied!';
        setTimeout(function () { copyLabel.textContent = 'Copy'; }, 2000);
      });
    });
  }

  if (screenshotInput) {
    screenshotInput.addEventListener('change', function () {
      state.screenshot = null;
      hideError();
      if (screenshotPreview) screenshotPreview.hidden = true;

      const file = screenshotInput.files && screenshotInput.files[0];
      if (!file) return;

      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        showError('Please upload a PNG or JPG image of your payment screenshot.');
        screenshotInput.value = '';
        return;
      }
      if (file.size > OC_CONFIG.MAX_UPLOAD_BYTES) {
        showError('That image is too large (max 10 MB). Please upload a smaller screenshot.');
        screenshotInput.value = '';
        return;
      }

      prepareScreenshot(file)
        .then(function (result) {
          state.screenshot = result;
          if (screenshotPreview) {
            screenshotPreview.src = 'data:' + result.mimeType + ';base64,' + result.base64;
            screenshotPreview.hidden = false;
          }
        })
        .catch(function () {
          showError('Could not read that image. Please try a different screenshot.');
          screenshotInput.value = '';
        });
    });
  }

  /**
   * Downscales the screenshot to JPEG in the browser so uploads stay small on
   * mobile data (a phone screenshot is often 1–3 MB as PNG). Falls back to the
   * original file if the browser can't decode it into a canvas.
   */
  function prepareScreenshot(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, OC_CONFIG.SCREENSHOT_MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        readFileAsBase64(file).then(resolve, reject);
      };

      img.src = url;
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({ base64: String(reader.result).split(',')[1], mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      if (!state.slot || !state.patient) {
        showError('Please choose a time and fill in your details first.');
        goToStep(state.slot ? 2 : 1);
        return;
      }

      if (!state.screenshot) {
        showError('Please upload a screenshot of your UPI payment so we can verify it.');
        return;
      }

      const upiRefInput = document.getElementById('oc-upi-ref');
      const upiRef = upiRefInput.value.replace(/\s+/g, '');
      if (!/^[0-9]{12}$/.test(upiRef)) {
        showError('Please enter the 12-digit UPI transaction ID (UTR) from your payment receipt.');
        upiRefInput.focus();
        return;
      }

      const submitBtn = paymentForm.querySelector('[data-oc-submit-payment]');
      const submitLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking payment…';
      }

      function resetSubmitBtn() {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }

      fetch(OC_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitBooking',
          date: state.date,
          slotStart: state.slot.start,
          slotEnd: state.slot.end,
          name: state.patient.name,
          phone: state.patient.phone,
          email: state.patient.email,
          reason: state.patient.reason,
          upiRef: upiRef,
          screenshotBase64: state.screenshot.base64,
          screenshotMimeType: state.screenshot.mimeType
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          resetSubmitBtn();

          if (data.error === 'slot_taken') {
            goToStep(1);
            showError('Sorry, that slot was just booked by someone else. Please choose another time and submit again — you don\'t need to pay again.');
            fetchSlots(state.date);
            return;
          }

          if (data.error === 'screenshot_too_large' || data.error === 'invalid_screenshot') {
            showError('We couldn\'t accept that screenshot. Please upload a PNG or JPG image under 5 MB.');
            return;
          }

          if (data.error === 'payment_not_successful') {
            showError('Your screenshot shows the payment as failed or pending. Please upload the screenshot of a successful payment of ' + feeDisplay + '.');
            return;
          }

          if (data.error === 'screenshot_not_recognised') {
            showError('We couldn\'t recognise this as a UPI payment screenshot. Please upload the "payment successful" screen that shows the amount and transaction ID.');
            return;
          }

          if (data.error === 'duplicate_payment') {
            showError('This UPI transaction ID has already been used for another booking. Please check the transaction ID, or call/WhatsApp us if you think this is a mistake.');
            return;
          }

          if (data.error === 'invalid_field' && data.field === 'upiRef') {
            showError('Please enter the 12-digit UPI transaction ID (UTR) from your payment receipt.');
            return;
          }

          if (data.error) {
            console.error('Online consultation booking failed:', data);
            showError('Something went wrong submitting your booking. Please try again, or call/WhatsApp us. ' +
              '(Error: ' + data.error + (data.field ? ' / ' + data.field : '') +
              (data.message ? ' — ' + data.message : '') + ')');
            return;
          }

          showSubmitted(data);
        })
        .catch(function () {
          resetSubmitBtn();
          showError('Could not reach the booking service. Please check your connection and try again.');
        });
    });
  }

  function showSubmitted(data) {
    if (confirmDatetime) {
      confirmDatetime.textContent = data.slotStart ? formatConfirmedDatetime(data.slotStart) : '';
    }
    if (confirmId && data.bookingId) {
      confirmId.textContent = 'Booking ID: ' + data.bookingId;
    }
    if (meetLinkEl && data.meetLink) {
      meetLinkEl.href = data.meetLink;
      meetLinkEl.hidden = false;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', { lead_type: 'online_consultation', value: OC_CONFIG.CONSULTATION_FEE_INR, currency: 'INR' });
    }
    goToStep(4);
  }

  function formatConfirmedDatetime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  }

  /* ---------- Fade-in-on-scroll, matching the site's existing reveal pattern ---------- */

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealObserver.observe(root);
});
