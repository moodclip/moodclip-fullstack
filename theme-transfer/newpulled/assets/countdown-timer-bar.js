if (!customElements.get('countdown-timer-bar')) {
  class CountdownBar extends HTMLElement {
    constructor() {
      super();
      this.userDate = this.getAttribute("data-date");
      this.userTime = this.getAttribute("data-time");
      this.interval;
      this.setInterval(this.userDate, this.userTime);
      this.calcHeight();
    }
  
    onInit(userDate, userTime) {
      this.completedCountdown = this.getAttribute("data-completed");
      this.countdown = this.querySelector(".countdown-timer-bar__main");
      this.countdownHeading = this.querySelector(".countdown-timer-bar__end");
      this.daysEl = this.querySelector(".countdown-timer-bar__days");
      this.hoursEl = this.querySelector(".countdown-timer-bar__hours");
      this.minutesEl = this.querySelector(".countdown-timer-bar__minutes");
      this.secondsEl = this.querySelector(".countdown-timer-bar__seconds");
      this.section = this.closest(".section-countdown-timer-bar");
      // ----------------------------------------------------------------
      const countdownDate = new Date(`${userDate}T${userTime}`);
      const now = new Date();
      const distance = countdownDate.getTime() - now.getTime();
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      // ----------------------------------------------------------------
      if (distance < 0 && this.completedCountdown === "hide_section") {
        clearInterval(this.interval);
        this.section.style.display = "none";
      } else if (distance < 0 && this.completedCountdown === "show_text") {
        if (this.countdown) this.countdown.style.display = "none";
        if (this.countdownHeading) this.countdownHeading.style.display = "flex"
      } else {
        if (String(days).length === 1) {
          if (this.daysEl) this.daysEl.textContent = '0' + days;
        } else {
          if (this.daysEl) this.daysEl.textContent = days;
        }

        if (String(hours).length === 1) {
          if (this.hoursEl) this.hoursEl.textContent = '0' + hours;
        } else {
          if (this.hoursEl) this.hoursEl.textContent = hours;
        }

        if (String(minutes).length === 1) {
          if (this.minutesEl) this.minutesEl.textContent = '0' + minutes;
        } else {
          if (this.minutesEl) this.minutesEl.textContent = minutes;
        }

        if (String(seconds).length === 1) {
          if (this.secondsEl) this.secondsEl.textContent = '0' + seconds;
        } else {
          if (this.secondsEl) this.secondsEl.textContent = seconds;
        }
      }
    }
  
    setInterval(userDate, userTime) {
      clearInterval(this.interval);
      this.interval = setInterval(
        this.onInit.bind(this, userDate, userTime),
        1000,
      );
    }

    calcHeight() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.documentElement.style.setProperty("--countdown-bar-height", `${entry.boundingClientRect.height}px`);
          } else {
            document.documentElement.style.setProperty("--countdown-bar-height", "0px");
          }
        })
      });

      observer.observe(this);
    }
  }
  
  customElements.define("countdown-timer-bar", CountdownBar);
}
