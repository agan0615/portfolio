(() => {
  'use strict';
  const root = document.documentElement;
  root.dataset.enhanced = 'true';
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const mobile = window.matchMedia('(max-width: 699px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '关闭' : '菜单';
  };
  menuButton.hidden = !mobile.matches;
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobile.addEventListener('change', () => { menuButton.hidden = !mobile.matches; setMenu(false); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header') && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
  });

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('will-reveal');
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        document.querySelectorAll('.will-reveal').forEach(element => element.classList.add('is-revealed'));
      }
    });
  }

  const header = document.querySelector('.site-header');
  let scheduled = false;
  const updateScrollState = () => {
    const maxScroll = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--progress', maxScroll > 0 ? String(Math.min(1, Math.max(0, window.scrollY / maxScroll))) : '0');
    root.style.setProperty('--hero-shift', reducedMotion.matches ? '0px' : `${Math.min(28,window.scrollY * 0.05)}px`);
    header.classList.toggle('is-scrolled', window.scrollY > 16);
    scheduled = false;
  };
  const queueScrollUpdate = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateScrollState); }
  };
  window.addEventListener('scroll', queueScrollUpdate, { passive: true });
  window.addEventListener('resize', queueScrollUpdate, { passive: true });
  document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', queueScrollUpdate));
  updateScrollState();

  document.querySelectorAll('.image-frame img').forEach(image => {
    const showFallback = () => {
      const parent = image.closest('.image-frame');
      if (parent.querySelector('.image-fallback')) return;
      image.hidden = true;
      const message = document.createElement('p');
      message.className = 'image-fallback';
      message.textContent = `${image.alt}（图片暂时无法显示）`;
      parent.appendChild(message);
    };
    image.addEventListener('error', showFallback);
    if (image.complete && !image.naturalWidth) showFallback();
  });

  const copyButton = document.querySelector('#copy-email');
  const copyStatus = document.querySelector('#copy-status');
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const email = 'ganyh@tju.edu.cn';
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(email);
      else {
        const field = document.createElement('textarea');
        field.value = email;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        copyButton.focus();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      copyStatus.textContent = '邮箱已复制，期待与你交流。';
    } catch {
      copyStatus.textContent = `未能自动复制，请手动复制：${email}`;
    }
  });
  document.querySelector('#current-year').textContent = String(new Date().getFullYear());

  const imageDialog = document.querySelector('.image-dialog');
  let imageTrigger;
  if (imageDialog && typeof imageDialog.showModal === 'function') {
    const sizeToggle = imageDialog.querySelector('.image-size-toggle');
    const canvas = imageDialog.querySelector('.dialog-canvas');
    const resetImageSize = () => {
      imageDialog.classList.remove('is-zoomed');
      sizeToggle.setAttribute('aria-pressed','false');
      sizeToggle.textContent = '原图尺寸';
      canvas.scrollTo(0,0);
    };
    sizeToggle.addEventListener('click', () => {
      const zoomed = imageDialog.classList.toggle('is-zoomed');
      sizeToggle.setAttribute('aria-pressed',String(zoomed));
      sizeToggle.textContent = zoomed ? '适应窗口' : '原图尺寸';
      canvas.scrollTo(0,0);
    });
    document.querySelectorAll('.media-zoom').forEach(link => link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      imageTrigger = link;
      resetImageSize();
      const image = imageDialog.querySelector('.dialog-image');
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || link.dataset.imageTitle;
      document.querySelector('#image-dialog-title').textContent = link.dataset.imageTitle;
      imageDialog.showModal();
      imageDialog.querySelector('.dialog-close').focus();
    }));
    imageDialog.querySelector('.dialog-close').addEventListener('click', () => imageDialog.close());
    imageDialog.addEventListener('click', event => {
      if (event.target !== imageDialog) return;
      const rect = imageDialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) imageDialog.close();
    });
    imageDialog.addEventListener('close', () => imageTrigger?.focus({preventScroll:true}));
  }

  const preciseHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('[data-report-demo]').forEach(video => {
    let inView = false;
    let userPaused = false;
    let automaticPause = false;
    const pauseAutomatically = () => {
      if (!video.paused) { automaticPause = true; video.pause(); }
    };
    const updatePlayback = () => {
      if (inView && !document.hidden && !reducedMotion.matches && !userPaused) {
        video.play().catch(() => {});
      } else pauseAutomatically();
    };
    video.muted = true;
    video.addEventListener('pause', () => {
      if (automaticPause) automaticPause = false;
      else userPaused = true;
    });
    video.addEventListener('play', () => { userPaused = false; });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inView = entries[0].intersectionRatio >= 0.35;
        updatePlayback();
      }, {threshold:0.35});
      observer.observe(video);
    }
    reducedMotion.addEventListener('change', updatePlayback);
    document.addEventListener('visibilitychange', updatePlayback);
  });
  document.querySelectorAll('.roadmap-disclosure').forEach(detail => {
    const summary = detail.querySelector('summary');
    let pinned = detail.open;
    let preview = false;
    const closePreview = () => {
      if (preview && !pinned && !detail.contains(document.activeElement)) {
        detail.open = false;
        preview = false;
      }
    };
    detail.addEventListener('mouseenter', () => {
      if (preciseHover.matches && !pinned) { preview = true; detail.open = true; }
    });
    detail.addEventListener('mouseleave', closePreview);
    summary.addEventListener('click', event => {
      event.preventDefault();
      if (preview && detail.open) { pinned = true; preview = false; }
      else { pinned = !detail.open; preview = false; detail.open = pinned; }
    });
    detail.addEventListener('click', event => {
      if (event.target.closest('.media-zoom')) { pinned = true; preview = false; }
    }, true);
    detail.addEventListener('focusout', () => setTimeout(() => {
      if (!detail.matches(':hover')) closePreview();
    }, 0));
    detail.addEventListener('keydown', event => {
      if (event.key === 'Escape' && detail.open) {
        pinned = false; preview = false; detail.open = false; summary.focus();
      }
    });
    preciseHover.addEventListener('change', () => { if (!preciseHover.matches) closePreview(); });
  });
})();
