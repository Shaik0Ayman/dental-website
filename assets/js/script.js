'use strict';



/**
 * addEvent on element
 */

const addEventOnElem = function (elem, type, callback) {
  if (elem.length > 1) {
    for (let i = 0; i < elem.length; i++) {
      elem[i].addEventListener(type, callback);
    }
  } else {
    elem.addEventListener(type, callback);
  }
}



/**
 * navbar toggle
 */

const navbar = document.querySelector("[data-navbar]");
const navbarLinks = document.querySelectorAll("[data-nav-link]");
const navbarToggler = document.querySelector("[data-nav-toggler]");

const toggleNav = function () {
  navbar.classList.toggle("active");
  navbarToggler.classList.toggle("active");
}

addEventOnElem(navbarToggler, "click", toggleNav);

const closeNav = function () {
  navbar.classList.remove("active");
  navbarToggler.classList.remove("active");
}

addEventOnElem(navbarLinks, "click", closeNav);



/**
 * header active
 */

const header = document.querySelector("[data-header]");
const backTopBtn = document.querySelector("[data-back-top-btn]");

window.addEventListener("scroll", function () {
  if (window.scrollY >= 100) {
    header.classList.add("active");
    backTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    backTopBtn.classList.remove("active");
  }
});

  const figure = document.querySelector('.service-bounce');
  const img = figure?.querySelector('img');
  
  if (figure && img) {
    figure.style.overflow = 'visible';
  
    figure.addEventListener('mousemove', (e) => {
      const rect = figure.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Max movement in px
      const maxMove = 30;
      const moveX = ((x - centerX) / centerX) * maxMove;
      const moveY = ((y - centerY) / centerY) * maxMove;
      img.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.04)`;
    });
  
    figure.addEventListener('mouseleave', () => {
      img.style.transform = 'translate(0,0) scale(1)';
    });
  }

document.addEventListener("DOMContentLoaded", function () {
  const serviceCards = document.querySelectorAll('.service-card');

  function revealOnScroll() {
    const triggerBottom = window.innerHeight * 0.92;
    serviceCards.forEach(card => {
      const cardTop = card.getBoundingClientRect().top;
      if (cardTop < triggerBottom) {
        card.classList.add('in-view');
      }
    });
  }

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Initial check
});

document.addEventListener("DOMContentLoaded", function () {
  const heroImg = document.querySelector('.hero-banner img');
  function revealHeroImg() {
    if (!heroImg) return;
    const rect = heroImg.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      heroImg.classList.add('in-view');
      window.removeEventListener('scroll', revealHeroImg);
    }
  }
  window.addEventListener('scroll', revealHeroImg);
  revealHeroImg();
});

document.addEventListener("DOMContentLoaded", function () {
  const el = document.getElementById('hero-typing');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  let i = 0;
  function type() {
    if (i <= text.length) {
      el.textContent = text.slice(0, i);
      i++;
      setTimeout(type, 40); // Typing speed in ms
    }
  }
  type();
});

document.addEventListener("DOMContentLoaded", function () {
  const heroTitle = document.querySelector('.hero-title');
  function revealHeroTitle() {
    if (!heroTitle) return;
    const rect = heroTitle.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      heroTitle.classList.add('in-view');
      window.removeEventListener('scroll', revealHeroTitle);
    }
  }
  window.addEventListener('scroll', revealHeroTitle);
  revealHeroTitle();
});

document.addEventListener("DOMContentLoaded", function () {
  const heroText = document.querySelector('.hero-text');
  function revealHeroText() {
    if (!heroText) return;
    const rect = heroText.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      heroText.classList.add('in-view');
      window.removeEventListener('scroll', revealHeroText);
    }
  }
  window.addEventListener('scroll', revealHeroText);
  revealHeroText();
});
document.addEventListener("DOMContentLoaded", function () {
  const serviceBannerImg = document.querySelector('.service-bounce img');
  function revealServiceBanner() {
    if (!serviceBannerImg) return;
    const rect = serviceBannerImg.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      serviceBannerImg.classList.add('in-view');
      window.removeEventListener('scroll', revealServiceBanner);
    }
  }
  window.addEventListener('scroll', revealServiceBanner);
  revealServiceBanner();
});

document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    setTimeout(() => {
      navbar.classList.add('in-view');
    }, 200); // Delay for effect, adjust as needed
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const aboutImg = document.querySelector('.about-banner img');
  function revealAboutImg() {
    if (!aboutImg) return;
    const rect = aboutImg.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      aboutImg.classList.add('in-view');
      window.removeEventListener('scroll', revealAboutImg);
    }
  }
  window.addEventListener('scroll', revealAboutImg);
  revealAboutImg();
});

document.addEventListener("DOMContentLoaded", function () {
  const aboutContent = document.querySelector('.about-content');
  function revealAboutContent() {
    if (!aboutContent) return;
    const rect = aboutContent.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      aboutContent.classList.add('in-view');
      window.removeEventListener('scroll', revealAboutContent);
    }
  }
  window.addEventListener('scroll', revealAboutContent);
  revealAboutContent();
});

document.addEventListener("DOMContentLoaded", function () {
  // Doctor section transitions
  const doctorSubtitle = document.querySelector('.section.doctor .section-subtitle');
  const doctorTitle = document.querySelector('.section.doctor .section-title');
  const doctorCards = document.querySelectorAll('.doctor-card');

  function revealDoctorSection() {
    const trigger = window.innerHeight * 0.92;
    if (doctorSubtitle && doctorSubtitle.getBoundingClientRect().top < trigger) {
      doctorSubtitle.classList.add('in-view');
    }
    if (doctorTitle && doctorTitle.getBoundingClientRect().top < trigger) {
      doctorTitle.classList.add('in-view');
    }
    doctorCards.forEach(card => {
      if (card.getBoundingClientRect().top < trigger) {
        card.classList.add('in-view');
      }
    });
  }

  window.addEventListener('scroll', revealDoctorSection);
  revealDoctorSection();
});


/**
 * Smooth scrolling for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

/**
 * Intersection Observer for animations
 */
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, observerOptions);

// Elements to observe
const elementsToAnimate = document.querySelectorAll('.service-card, .doctor-card, .about-content, .cta-content');
elementsToAnimate.forEach(el => observer.observe(el));

/**
 * Add loading animation to service cards
 */
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach((card, index) => {
  card.style.animationDelay = `${index * 0.2}s`;
  card.style.animation = 'fadeInUp 0.8s ease forwards';
});

/**
 * Add typing effect to hero subtitle
 */
const heroSubtitle = document.getElementById('hero-typing');
if (heroSubtitle) {
  const text = heroSubtitle.textContent;
  heroSubtitle.textContent = '';
  heroSubtitle.style.borderRight = '3px solid var(--royal-blue-light)';
  heroSubtitle.style.animation = 'blink-cursor 1s infinite';
  
  let i = 0;
  const typeWriter = () => {
    if (i < text.length) {
      heroSubtitle.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 100);
    } else {
      setTimeout(() => {
        heroSubtitle.style.borderRight = 'none';
      }, 1000);
    }
  };
  
  setTimeout(typeWriter, 1000);
}
