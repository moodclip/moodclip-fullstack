// Ensure GSAP is loaded before this script runs.
// You already have calls like gsap.to() later in your global.js,
// so it's highly likely GSAP is available.

window.addEventListener('load', function() {
  const preloader = document.getElementById('preloader');
  const preloaderOverlay = document.getElementById('preloader-overlay');
  const preloaderIconContainer = document.getElementById('preloader-icon-container');

  if (preloader && preloaderOverlay && preloaderIconContainer) {
    // Add the class to body to make background black during fade-out
    document.body.classList.add('preloader-active-bg-black');

    // Hide icon instantly
    preloaderIconContainer.style.display = 'none';

    // Use GSAP to animate the opacity of the background overlay
    gsap.to(preloaderOverlay, {
      opacity: 0,
      duration: 1, // 1 second fade duration
      ease: "power3.out", // Smooth easing
      onComplete: () => {
        // Once the fade is complete, remove the preloader-active-bg-black class from body
        document.body.classList.remove('preloader-active-bg-black');
        // Then, remove the entire preloader div
        preloader.remove();
      }
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
	const slideInItems = document.querySelectorAll(".slide-up-animated");
	if (!slideInItems) return;
	slideInItems.forEach((item) => {
		item.classList.add("animation-start");
	});
});
function getSliderSettings() {
	return {
		slidesPerView: 1,
		navigation: {
			nextEl: ".swiper-button-next",
			prevEl: ".swiper-button-prev",
		},
	};
}

function getSubSliderProductSettings() {
	return {
		slidesPerView: "auto",
		direction: "vertical",
		navigation: false,
	};
}

const sliderInit = (isUpdate) => {
	const sliders = document.querySelectorAll(".product-section .js-media-list");
	sliders.forEach((sliderElement) => {
			const thumbsSwiperElement = sliderElement
					.closest(".product-section")
					.querySelector(".js-media-sublist");

			let slider = new Swiper(sliderElement, {
					slidesPerView: 1,
					autoHeight: true,
					spaceBetween: 4,
					navigation: {
							nextEl: sliderElement
									.closest(".product-section")
									.querySelector(".swiper-btn--next"),
							prevEl: sliderElement
									.closest(".product-section")
									.querySelector(".swiper-btn--prev"),
					},
					thumbs: {
							swiper: thumbsSwiperElement ? thumbsSwiperElement.swiper : null,
					},
					on: {
							slideChangeTransitionStart: function () {
									if (thumbsSwiperElement) {
											thumbsSwiperElement.swiper.slideTo(this.activeIndex);
									}
							},
							slideChange: function () {
									window.pauseAllMedia();
									this.params.noSwiping = false;
							},
							slideChangeTransitionEnd: function () {
									const modelViewer = this.slides[this.activeIndex]?.querySelector(
											"model-viewer"
									);
									if (modelViewer) {
											modelViewer
													.querySelector(".shopify-model-viewer-ui__button--poster")
													?.removeAttribute("hidden");
									}
							},
							touchStart: function () {
									const modelViewer = this.slides[this.activeIndex]?.querySelector(
											"model-viewer"
									);
									if (
											modelViewer &&
											!modelViewer.classList.contains("shopify-model-viewer-ui__disabled")
									) {
											this.params.noSwiping = true;
											this.params.noSwipingClass = "swiper-slide";
									}
							},
					},
			});

			if (isUpdate) {
					setTimeout(() => {
							slider.update();
					}, 800);
			}
	});
};


const subSliderInit = (isUpdate) => {
	const subSliders = document.querySelectorAll(".product-section .js-media-sublist");
	subSliders.forEach((subSliderElement) => {
			const mainSliderElement = subSliderElement
					.closest(".product-section")
					.querySelector(".js-media-list");

			let subSlider = new Swiper(subSliderElement, {
					centeredSlides: true,
					centeredSlidesBounds: true,
					slidesPerView: 3,
					spaceBetween: 8,
					direction: "horizontal",
					navigation: false,
					freeMode: false,
					watchSlidesProgress: true,
					on: {
							touchEnd: function (s) {
									const range = 5;
									const diff = s.isHorizontal()
											? s.touches.currentX - s.touches.startX
											: s.touches.currentY - s.touches.startY;
									if (Math.abs(diff) < range) {
											s.allowClick = true;
									}
							},
					},
					transitionStart: function () {
							if (mainSliderElement) {
									mainSliderElement.swiper.slideTo(this.activeIndex);
							}
					},
					breakpoints: {
							990: {
									direction: "vertical",
									slidesPerView: 7,
									spaceBetween: 16,
							},
					},
			});

			if (isUpdate) {
					setTimeout(() => {
							subSlider.update();
					}, 800);
			}
	});
};

const scrollSliderInit = (isUpdate) => {
	const sliderContainer = document.querySelector(".product-section .product__media--scroll");
	let isSliderHovered = false;
	let isAtEndOfSlider = false;

	if (sliderContainer) {
		let slider = new Swiper(sliderContainer, {
			direction: 'vertical',
			slidesPerView: 1,
			autoHeight: false,
			keyboard: true,
			spaceBetween: 0,
			mousewheel: true,
			navigation: {
				nextEl: ".swiper-btn--next",
				prevEl: ".swiper-btn--prev",
			},
			pagination: {
				el: `.swiper-pagination`,
				type: "fraction",
				formatFractionCurrent: (number) => `0${number}`.slice(-2),
				formatFractionTotal: (number) => `0${number}`.slice(-2),
			},
			on: {
				init: function() {
					const innerHeight = window.innerHeight - 160;
					sliderContainer.style.height = `${innerHeight}px`;
					this.slides.forEach(slide => {
						slide.style.height = `${window.innerHeight}px`;
					});
				},
				reachEnd: () => {
					isAtEndOfSlider = true;
				},
				slideChange: () => {
					isAtEndOfSlider = false;
				}
			}
		});

		const preventPageScroll = (e) => {
			if (isSliderHovered && !isAtEndOfSlider) {
				e.preventDefault();
			}
		};

		sliderContainer.addEventListener("mouseenter", () => {
			isSliderHovered = true;
		});

		sliderContainer.addEventListener("mouseleave", () => {
			isSliderHovered = false;
		});

		window.addEventListener("wheel", (e) => {
			if (isSliderHovered && !isAtEndOfSlider) {
				preventPageScroll(e);
				slider.mousewheel.enable();
			} else {
				slider.mousewheel.disable();
			}
		}, { passive: false });

		if (isUpdate) {
			setTimeout(() => {
				slider.update();
			}, 800);
		}
	}
};

document.addEventListener("DOMContentLoaded", function () {
	scrollSliderInit();
	document.addEventListener("shopify:section:load", function () {
		scrollSliderInit(true);
	});
});

const sliderHorizontalInit = (isUpdate) => {
	const horizontalSlider = document.querySelector(".product-section .product__media-list-wrapper-horizontal .js-media-list-horizontal");
	const secondarySlider = document.querySelector(".product-section .product__media-list-wrapper-horizontal.secondary .js-media-list-horizontal");
	let carousel = horizontalSlider ? horizontalSlider.querySelectorAll(".swiper-wrapper") : [];

	let slider2;
	let slider1;
	if (secondarySlider ) {
			 slider2 = new Swiper(secondarySlider, {
					slidesPerView: 1,
					//slidesOffsetAfter: 400,
					//slidesOffsetBefore: 400,
					//loop: true,
					//initialSlide: 3,
					autoHeight: true,
					spaceBetween: 0,
					on: {
							slideChange: function () {
									window.pauseAllMedia();
							},
					},
			});

			if (isUpdate) {
					setTimeout(() => {
							slider2.update();
					}, 800);
			}
	}

	if (horizontalSlider && horizontalSlider.querySelectorAll(".swiper-slide").length > 1) {
		 slider1 = new Swiper(horizontalSlider, {
				slidesPerView: 1.2,
				//loop: true,
				autoHeight: true,
				spaceBetween: 16,
				//slidesOffsetAfter: 80,
				breakpoints: {
					990: {
						slidesPerView: 1.4,
					},
					1200: {
						slidesPerView: 1.6,
					},
					1360: {
						slidesPerView: 2,
					},
				},
				controller: {control: slider2 },
				navigation: {
					nextEl: ".swiper-horizontal-btn-next",
					prevEl: ".swiper-horizontal-btn-prev",
				},
				on: {
						slideChange: function () {
							window.pauseAllMedia();
						},
				},
		});

		if (isUpdate) {
				setTimeout(() => {
						slider1.update();
				}, 800);
		}
	}
	if (horizontalSlider && secondarySlider) {
		slider1.controller.control = slider2;
		slider2.controller.control = slider1;
	}
};

document.addEventListener("DOMContentLoaded", function () {
	sliderHorizontalInit();
	document.addEventListener("shopify:section:load", function () {
		sliderHorizontalInit(true);
	});
});

function getFocusableElements(container) {
	return Array.from(
		container.querySelectorAll(
			"summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
		)
	);
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
	summary.setAttribute("role", "button");
	summary.setAttribute("aria-expanded", "false");

	if (summary.nextElementSibling.getAttribute("id")) {
		summary.setAttribute("aria-controls", summary.nextElementSibling.id);
	}

	summary.addEventListener("click", (event) => {
		event.currentTarget.setAttribute(
			"aria-expanded",
			!event.currentTarget.closest("details").hasAttribute("open")
		);
	});

	if (summary.closest("header-drawer")) return;
	summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});

function onKeyUpEscape(event) {
	if (event.code.toUpperCase() !== "ESCAPE") return;

	const openDetailsElement = event.target.closest("details[open]");
	if (!openDetailsElement) return;

	const summaryElement = openDetailsElement.querySelector("summary");
	openDetailsElement.removeAttribute("open");
	summaryElement.setAttribute("aria-expanded", false);
	summaryElement.focus();
}

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
	var elements = getFocusableElements(container);
	var first = elements[0];
	var last = elements[elements.length - 1];

	removeTrapFocus();

	trapFocusHandlers.focusin = (event) => {
		if (
			event.target !== container &&
			event.target !== last &&
			event.target !== first
		)
			return;

		document.addEventListener("keydown", trapFocusHandlers.keydown);
	};

	trapFocusHandlers.focusout = function () {
		document.removeEventListener("keydown", trapFocusHandlers.keydown);
	};

	trapFocusHandlers.keydown = function (event) {
		if (event.code.toUpperCase() !== "TAB") return; // If not TAB key
		// On the last focusable element and tab forward, focus the first element.
		if (event.target === last && !event.shiftKey) {
			event.preventDefault();
			first.focus();
		}

		//  On the first focusable element and tab backward, focus the last element.
		if (
			(event.target === container || event.target === first) &&
			event.shiftKey
		) {
			event.preventDefault();
			last.focus();
		}
	};

	document.addEventListener("focusout", trapFocusHandlers.focusout);
	document.addEventListener("focusin", trapFocusHandlers.focusin);

	elementToFocus.focus();
}

function pauseAllMedia() {
	document.querySelectorAll(".js-youtube").forEach((video) => {
		video.contentWindow.postMessage(
			'{"event":"command","func":"' + "pauseVideo" + '","args":""}',
			"*"
		);
	});
	document.querySelectorAll(".js-vimeo").forEach((video) => {
		video.contentWindow.postMessage('{"method":"pause"}', "*");
	});
	document.querySelectorAll("video").forEach((video) => video.pause());
	document.querySelectorAll("product-model").forEach((model) => {
		if (model.modelViewerUI) model.modelViewerUI.pause();
	});
}

function removeTrapFocus(elementToFocus = null) {
	document.removeEventListener("focusin", trapFocusHandlers.focusin);
	document.removeEventListener("focusout", trapFocusHandlers.focusout);
	document.removeEventListener("keydown", trapFocusHandlers.keydown);

	if (elementToFocus) elementToFocus.focus();
}

class QuantityInput extends HTMLElement {
	constructor() {
		super();
		this.input = this.querySelector("input");
		this.changeEvent = new Event("change", { bubbles: true });

		this.querySelectorAll("button").forEach((button) =>
			button.addEventListener("click", this.onButtonClick.bind(this))
		);

var eventList = ["paste", "input"];

for (const event of eventList) {
    this.input.addEventListener(event, function (e) {
        const numberRegex = /^0*?[1-9]\d*$/;

				if (
					numberRegex.test(e.currentTarget.value) ||
					e.currentTarget.value === ""
				) {
					e.currentTarget.value;
				} else {
					e.currentTarget.value = 1;
				}
			});
		}

		this.input.addEventListener("focusout", function (e) {
			if (e.currentTarget.value === "") {
				e.currentTarget.value = 1;
			}
		});
	}

	onButtonClick(event) {
		event.preventDefault();
		const previousValue = this.input.value;

		event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
		if (previousValue !== this.input.value)
			this.input.dispatchEvent(this.changeEvent);
	}
}

customElements.define("quantity-input", QuantityInput);

function debounce(fn, wait) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, args), wait);
	};
}

const serializeForm = (form) => {
	const obj = {};
	const formData = new FormData(form);
	for (const key of formData.keys()) {
		obj[key] = formData.get(key);
	}
	return JSON.stringify(obj);
};

function fetchConfig(type = "json") {
	return {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: `application/${type}`,
		},
	};
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
	window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
	return function () {
		return fn.apply(scope, arguments);
	};
};

Shopify.setSelectorByValue = function (selector, value) {
	for (var i = 0, count = selector.options.length; i < count; i++) {
		var option = selector.options[i];
		if (value == option.value || value == option.innerHTML) {
			selector.selectedIndex = i;
			return i;
		}
	}
};

Shopify.addListener = function (target, eventName, callback) {
	target.addEventListener
		? target.addEventListener(eventName, callback, false)
		: target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
	options = options || {};
	var method = options["method"] || "post";
	var params = options["parameters"] || {};

	var form = document.createElement("form");
	form.setAttribute("method", method);
	form.setAttribute("action", path);

	for (var key in params) {
		var hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", key);
		hiddenField.setAttribute("value", params[key]);
		form.appendChild(hiddenField);
	}
	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
	country_domid,
	province_domid,
	options
) {
	this.countryEl = document.getElementById(country_domid);
	this.provinceEl = document.getElementById(province_domid);
	this.provinceContainer = document.getElementById(
		options["hideElement"] || province_domid
	);

	Shopify.addListener(
		this.countryEl,
		"change",
		Shopify.bind(this.countryHandler, this)
	);

	this.initCountry();
	this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
	initCountry: function () {
		var value = this.countryEl.getAttribute("data-default");
		Shopify.setSelectorByValue(this.countryEl, value);
		this.countryHandler();
	},

	initProvince: function () {
		var value = this.provinceEl.getAttribute("data-default");
		if (value && this.provinceEl.options.length > 0) {
			Shopify.setSelectorByValue(this.provinceEl, value);
		}
	},

	countryHandler: function (e) {
		var opt = this.countryEl.options[this.countryEl.selectedIndex];
		var raw = opt.getAttribute("data-provinces");
		var provinces = JSON.parse(raw);

		this.clearOptions(this.provinceEl);
		if (provinces && provinces.length == 0) {
			this.provinceContainer.style.display = "none";
		} else {
			for (var i = 0; i < provinces.length; i++) {
				var opt = document.createElement("option");
				opt.value = provinces[i][0];
				opt.innerHTML = provinces[i][1];
				this.provinceEl.appendChild(opt);
			}

			this.provinceContainer.style.display = "";
		}
	},

	clearOptions: function (selector) {
		while (selector.firstChild) {
			selector.removeChild(selector.firstChild);
		}
	},

	setOptions: function (selector, values) {
		for (var i = 0, count = values.length; i < values.length; i++) {
			var opt = document.createElement("option");
			opt.value = values[i];
			opt.innerHTML = values[i];
			selector.appendChild(opt);
		}
	},
};

class MenuDrawer extends HTMLElement {
	constructor() {
		super();

		this.mainDetailsToggle = this.querySelector("details");
		const summaryElements = this.querySelectorAll("summary");
		this.addAccessibilityAttributes(summaryElements);

		if (navigator.platform === "iPhone")
			document.documentElement.style.setProperty(
				"--viewport-height",
				`${window.innerHeight}px`
			);

		this.addEventListener("keyup", this.onKeyUp.bind(this));
		this.addEventListener("focusout", this.onFocusOut.bind(this));
		this.bindEvents();
	}

	bindEvents() {
		this.querySelectorAll("summary").forEach((summary) =>
			summary.addEventListener("click", this.onSummaryClick.bind(this))
		);
		this.querySelectorAll("button").forEach((button) => {
			if (this.querySelector(".header__localization-button") === button) return;
			if (this.querySelector(".header__localization-lang-button") === button)
				return;
			button.addEventListener("click", this.onCloseButtonClick.bind(this));
		});
	}

	addAccessibilityAttributes(summaryElements) {
		summaryElements.forEach((element) => {
			element.setAttribute("role", "button");
			element.setAttribute("aria-expanded", false);
			element.setAttribute("aria-controls", element.nextElementSibling.id);
		});
	}

	onKeyUp(event) {
		if (event.code.toUpperCase() !== "ESCAPE") return;

		const openDetailsElement = event.target.closest("details[open]");
		if (!openDetailsElement) return;

		openDetailsElement === this.mainDetailsToggle
			? this.closeMenuDrawer(this.mainDetailsToggle.querySelector("summary"))
			: this.closeSubmenu(openDetailsElement);
	}

	onSummaryClick(event) {
		const summaryElement = event.currentTarget;
		const detailsElement = summaryElement.parentNode;
		const isOpen = detailsElement.hasAttribute("open");

		if (detailsElement === this.mainDetailsToggle) {
			if (isOpen) event.preventDefault();
			isOpen
				? this.closeMenuDrawer(summaryElement)
				: this.openMenuDrawer(summaryElement);
		} else {
			trapFocus(
				summaryElement.nextElementSibling,
				detailsElement.querySelector("button")
			);

			setTimeout(() => {
				detailsElement.classList.add("menu-opening");
			});
		}
	}

	openMenuDrawer(summaryElement) {
		setTimeout(() => {
			this.mainDetailsToggle.classList.add("menu-opening");
		});
		summaryElement.setAttribute("aria-expanded", true);
		trapFocus(this.mainDetailsToggle, summaryElement);
		document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
	}

	closeMenuDrawer(event, elementToFocus = false) {
		if (event !== undefined) {
			this.mainDetailsToggle.classList.remove("menu-opening");
			this.mainDetailsToggle.querySelectorAll("details").forEach((details) => {
				details.removeAttribute("open");
				details.classList.remove("menu-opening");
			});
			this.mainDetailsToggle
				.querySelector("summary")
				.setAttribute("aria-expanded", false);
			document.body.classList.remove(
				`overflow-hidden-${this.dataset.breakpoint}`
			);
			removeTrapFocus(elementToFocus);
			this.closeAnimation(this.mainDetailsToggle);
		}
	}

	onFocusOut(event) {
		setTimeout(() => {
			if (
				this.mainDetailsToggle.hasAttribute("open") &&
				!this.mainDetailsToggle.contains(document.activeElement)
			)
				this.closeMenuDrawer();
		});
	}

	onCloseButtonClick(event) {
		const detailsElement = event.currentTarget.closest("details");
		this.closeSubmenu(detailsElement);
	}

	closeSubmenu(detailsElement) {
		const toggleSchemeElement = this.querySelector('.header__toggle-scheme');
		if (toggleSchemeElement && toggleSchemeElement.contains(document.activeElement)) {
			return;
		}
		
		detailsElement.classList.remove("menu-opening");
		removeTrapFocus();
		this.closeAnimation(detailsElement);
	}

	closeAnimation(detailsElement) {
		let animationStart;

		const handleAnimation = (time) => {
			if (animationStart === undefined) {
				animationStart = time;
			}

			const elapsedTime = time - animationStart;

			if (elapsedTime < 400) {
				window.requestAnimationFrame(handleAnimation);
			} else {
				detailsElement.removeAttribute("open");
				if (detailsElement.closest("details[open]")) {
					trapFocus(
						detailsElement.closest("details[open]"),
						detailsElement.querySelector("summary")
					);
				}
			}
		};

		window.requestAnimationFrame(handleAnimation);
	}
}

customElements.define("menu-drawer", MenuDrawer);

class HeaderDrawer extends MenuDrawer {
	constructor() {
		super();
	}

	openMenuDrawer(summaryElement) {
		this.header =
			this.header || document.querySelector(".shopify-section-header");
		this.borderOffset =
			this.borderOffset ||
			this.closest(".header-wrapper").classList.contains(
				"header-wrapper--border-bottom"
			)
				? 1
				: 0;
		document.documentElement.style.setProperty(
			"--header-bottom-position",
			`${parseInt(
				this.header.getBoundingClientRect().bottom - this.borderOffset
			)}px`
		);

		setTimeout(() => {
			this.mainDetailsToggle.classList.add("menu-opening");
		});

		summaryElement.setAttribute("aria-expanded", true);
		trapFocus(this.mainDetailsToggle, summaryElement);
		document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
	}
}

customElements.define("header-drawer", HeaderDrawer);

class accountModal extends HTMLElement {
	constructor() {
		super();

		this.addEventListener(
			"keyup",
			(evt) => evt.code === "Escape" && this.close()
		);
		this.querySelector("#accountModal-Overlay").addEventListener(
			"click",
			this.close.bind(this)
		);

		this.querySelector("#account-modal-close").addEventListener(
			"click",
			this.close.bind(this)
		);
		this.setHeaderCartIconAccessibility();
	}

	setHeaderCartIconAccessibility() {
		const cartLink = document.querySelector("#account-icon-open");
		cartLink.setAttribute("role", "button");
		cartLink.setAttribute("aria-haspopup", "dialog");
		cartLink.addEventListener("click", (event) => {
			event.preventDefault();
			this.open(cartLink);
		});
		cartLink.addEventListener("keydown", (event) => {
			if (event.code.toUpperCase() === "SPACE") {
				event.preventDefault();
				this.open(cartLink);
			}
		});
	}

	open(triggeredBy) {
		if (triggeredBy) this.setActiveElement(triggeredBy);
		setTimeout(() => {
			this.classList.add("animate", "active");
		});

		this.addEventListener(
			"transitionend",
			() => {
				const containerToTrapFocusOn = document.getElementById("account-modal");
				const focusElement =
					this.querySelector(".account__main") ||
					this.querySelector(".account__close");
				trapFocus(containerToTrapFocusOn, focusElement);
			},
			{ once: true }
		);

		document.body.classList.add("overflow-hidden");
	}

	close() {
		this.classList.remove("active");
		removeTrapFocus(this.activeElement);
		document.body.classList.remove("overflow-hidden");
	}

	setActiveElement(element) {
		this.activeElement = element;
	}
}

customElements.define("account-modal", accountModal);

class BurgerDrawer extends HTMLElement {
	constructor() {
		super();

		this.addEventListener(
			"keyup",
			(evt) => evt.code === "Escape" && this.close()
		);
		this.querySelector("#BurgerDrawer-Overlay").addEventListener(
			"click",
			this.close.bind(this)
		);

		//this.querySelector("#burger-drawer-close").addEventListener(
		//	"click",
		//	this.close.bind(this)
		//);
		this.setHeaderCartIconAccessibility();
	}

	setHeaderCartIconAccessibility() {
		const cartLink = document.querySelector("#burger-icon-bubble");
		const cartClose = document.querySelector("#burger-drawer-close");
		cartLink.setAttribute("role", "button");
		cartLink.setAttribute("aria-haspopup", "dialog");
		cartLink.addEventListener("click", (event) => {
			event.preventDefault();
			this.open(cartLink);
		});
		cartLink.addEventListener("keydown", (event) => {
			if (event.code.toUpperCase() === "SPACE") {
				event.preventDefault();
				this.open(cartLink);
			}
		});
		cartClose.addEventListener("click", (event) => {
			event.preventDefault();
			this.close(cartLink);
		});
		cartClose.addEventListener("keydown", (event) => {
			if (event.code.toUpperCase() === "SPACE") {
				event.preventDefault();
				this.close(cartLink);
			}
		});
	}

	open(triggeredBy) {
		if (triggeredBy) this.setActiveElement(triggeredBy);
		setTimeout(() => {
			this.classList.add("animate", "active");
		});

		//this.addEventListener(
		//	"transitionend",
		//	() => {
		//		const containerToTrapFocusOn = document.getElementById("BurgerDrawer");
		//		const focusElement =
		//			this.querySelector(".drawer__inner") ||
		//			this.querySelector(".burger__close");
		//		trapFocus(containerToTrapFocusOn, focusElement);
		//	},
		//	{ once: true }
		//);
		const cartLink = document.querySelector("#burger-icon-bubble");
		const cartClose = document.querySelector("#burger-drawer-close");
		cartLink.style.display = "none";
		cartClose.style.display = "block";

		document.body.classList.add("overflow-hidden");
	}

	close() {
		this.querySelectorAll('.drawer__accordion-title').forEach(btn => btn.classList.remove('active'));
		this.classList.remove("active");
		removeTrapFocus(this.activeElement);
		
		const cartLink = document.querySelector("#burger-icon-bubble");
		const cartClose = document.querySelector("#burger-drawer-close");
		cartClose.style.display = "none";
		cartLink.style.display = "block";
		document.body.classList.remove("overflow-hidden");
	}

	setActiveElement(element) {
		this.activeElement = element;
	}
}

customElements.define("burger-drawer", BurgerDrawer);

class ModalDialog extends HTMLElement {
	constructor() {
		super();
		this.querySelector('[id^="ModalClose-"]').addEventListener(
			"click",
			this.hide.bind(this, false)
		);
		const overlay = this.querySelector('#ModalClose-Overlay');
		if (overlay) {
			overlay.addEventListener('click', this.hide.bind(this, false));
		}
		this.addEventListener("keyup", (event) => {
			if (event.code.toUpperCase() === "ESCAPE") this.hide();
		});
		if (this.classList.contains("media-modal")) {
			this.addEventListener("pointerup", (event) => {
				if (
					event.pointerType === "mouse" &&
					!event.target.closest("deferred-media, product-model")
				)
					this.hide();
			});
		} else {
			this.addEventListener("click", (event) => {
				if (event.target === this) this.hide();
			});
		}
	}

	connectedCallback() {
		if (this.moved) return;
		this.moved = true;
		document.body.appendChild(this);
	}

	show(opener) {
		this.openedBy = opener;
		const popup = this.querySelector(".template-popup");
		document.body.classList.add("overflow-hidden");
		this.setAttribute("open", "");
		if (popup) popup.loadContent();
		trapFocus(this, this.querySelector('[role="dialog"]'));
		window.pauseAllMedia();
	}

	hide() {
		let isOpen = false;

		this.removeAttribute("open");
		removeTrapFocus(this.openedBy);
		window.pauseAllMedia();

		document.querySelectorAll("body > quick-add-modal").forEach((el) => {
			if (el.hasAttribute("open")) {
				isOpen = true;
			}
		});

		if (!isOpen) {
			document.body.classList.remove("overflow-hidden");
			document.body.dispatchEvent(new CustomEvent("modalClosed"));
		}
	}
}

customElements.define("modal-dialog", ModalDialog);

class ModalOpener extends HTMLElement {
	constructor() {
		super();

		const button = this.querySelector("button");

		if (!button) return;
		button.addEventListener("click", () => {
			const modal = document.querySelector(this.getAttribute("data-modal"));
			if (modal) modal.show(button);
		});
	}
}

customElements.define("modal-opener", ModalOpener);

class DeferredMedia extends HTMLElement {
	constructor() {
		super();
		this.querySelector('[id^="Deferred-Poster-"]')?.addEventListener(
			"click",
			this.loadContent.bind(this)
		);
		if (this.getAttribute("data-autoplay")) {
			this.loadContent();
		}
	}

	loadContent() {
		if (!this.getAttribute("loaded")) {
			const content = document.createElement("div");
			content.appendChild(
				this.querySelector("template").content.firstElementChild.cloneNode(true)
			);
			this.setAttribute("loaded", true);
			window.pauseAllMedia();
			const videoObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (this.getAttribute("data-autoplay")) {
							let playPromise = entry.target.play();
							if (playPromise !== undefined) {
								playPromise.then((_) => {}).catch((error) => {});
							}
						}
					} else {
						entry.target.pause();
					}
				});
			});
			const deferredElement = this.appendChild(
				content.querySelector("video, model-viewer, iframe")
			);

			if (
				deferredElement.nodeName == "VIDEO" ||
				deferredElement.nodeName == "IFRAME"
			) {
				// force autoplay for safari

				if (this.classList.contains("video-section__media")) {
					let playPromise = deferredElement.play();
					if (playPromise !== undefined) {
						playPromise.then((_) => {}).catch((error) => {});
					}
					videoObserver.observe(deferredElement);
				} else {
					deferredElement.play();
				}
			}
			if (
				this.closest(".swiper")?.swiper.slides[
					this.closest(".swiper").swiper.activeIndex
				].querySelector("model-viewer")
			) {
				if (
					!this.closest(".swiper")
						.swiper.slides[
							this.closest(".swiper").swiper.activeIndex
						].querySelector("model-viewer")
						.classList.contains("shopify-model-viewer-ui__disabled")
				) {
					this.closest(".swiper").swiper.params.noSwiping = true;
					this.closest(".swiper").swiper.params.noSwipingClass = "swiper-slide";
				}
			}
		}
	}
}

customElements.define("deferred-media", DeferredMedia);

class SliderComponent extends HTMLElement {
	constructor() {
		super();
		this.slider = this.querySelector(".slider");
		this.sliderItems = this.querySelectorAll(".slider__slide");
		this.pageCount = this.querySelector(".slider-counter--current");
		this.pageTotal = this.querySelector(".slider-counter--total");
		this.prevButton = this.querySelector('button[name="previous"]');
		this.nextButton = this.querySelector('button[name="next"]');

		if (!this.slider || !this.nextButton) return;

		const resizeObserver = new ResizeObserver((entries) => this.initPages());
		resizeObserver.observe(this.slider);

		this.slider.addEventListener("scroll", this.update.bind(this));
		this.prevButton.addEventListener("click", this.onButtonClick.bind(this));
		this.nextButton.addEventListener("click", this.onButtonClick.bind(this));
	}

	initPages() {
		if (!this.sliderItems.length === 0) return;
		this.slidesPerPage = Math.floor(
			this.slider.clientWidth / this.sliderItems[0].clientWidth
		);
		this.totalPages = this.sliderItems.length - this.slidesPerPage + 1;
		this.update();
	}

	update() {
		if (!this.pageCount || !this.pageTotal) return;
		this.currentPage =
			Math.round(this.slider.scrollLeft / this.sliderItems[0].clientWidth) + 1;

		if (this.currentPage === 1) {
			this.prevButton.setAttribute("disabled", true);
		} else {
			this.prevButton.removeAttribute("disabled");
		}

		if (this.currentPage === this.totalPages) {
			this.nextButton.setAttribute("disabled", true);
		} else {
			this.nextButton.removeAttribute("disabled");
		}

		this.pageCount.textContent = this.currentPage;
		this.pageTotal.textContent = this.totalPages;
	}

	onButtonClick(event) {
		event.preventDefault();
		const slideScrollPosition =
			event.currentTarget.name === "next"
				? this.slider.scrollLeft + this.sliderItems[0].clientWidth
				: this.slider.scrollLeft - this.sliderItems[0].clientWidth;
		this.slider.scrollTo({
			left: slideScrollPosition,
		});
	}
}

customElements.define("slider-component", SliderComponent);

class VariantSelects extends HTMLElement {
	constructor() {
		super();
		this.addEventListener("change", this.onVariantChange);
	}

	onVariantChange() {
		this.updateOptions();
		this.updateMasterId();
		this.toggleAddButton(true, "", false);
		this.updatePickupAvailability();
		this.updateVariantStatuses();

		if (!this.currentVariant) {
			this.toggleAddButton(true, "", true);
			this.setUnavailable();
		} else {
			if (!this.closest("floated-form")) {
				this.updateMedia();
			}
			this.updateURL();
			this.updateVariantInput();
			this.renderProductInfo();
		}
	}

	updateOptions() {
		const fieldsets = Array.from(this.querySelectorAll(".js-radio-colors"));

		this.options = Array.from(
			this.querySelectorAll("select"),
			(select) => select.value
		).concat(
			fieldsets.map((fieldset) => {
				return Array.from(fieldset.querySelectorAll("input")).find(
					(radio) => radio.checked
				).value;
			})
		);
	}

	updateMasterId() {
		if (this.variantData || this.querySelector('[type="application/json"]')) {
			this.currentVariant = this.getVariantData().find((variant) => {
				this.options.sort();
				variant.options.sort();

				return !variant.options
					.map((option, index) => {
						return this.options[index] === option;
					})
					.includes(false);
			});
		}
	}

	isHidden(elem) {
		const styles = window.getComputedStyle(elem);
		return styles.display === "none" || styles.visibility === "hidden";
	}

	updateMedia() {
		if (!this.currentVariant || !this.currentVariant?.featured_media) return;

		const newMedia = document.querySelector(
			`[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
		);

		const parent = newMedia.parentElement;

		const swiperWrappers = document.querySelectorAll(".product__media-wrapper, .global-variant-slider");

		swiperWrappers.forEach((elem) => {
			if (!this.isHidden(elem)) {
				const newMedia = elem.querySelector(
					`[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
				);
				const mediaList = elem.querySelector(".js-media-list, .global-variant-js-media-list");
				
				if (mediaList) {
					mediaList.swiper.slideTo(
						mediaList.swiper.slides.indexOf(newMedia)
					);
				} else {
					newMedia && parent.prepend(newMedia);

					window.setTimeout(() => {
						parent.scroll(0, 0);
					});
				}
			}
		});
	}

	updateURL() {
		if (!this.currentVariant || this.dataset.updateUrl === "false") return;
		window.history.replaceState(
			{},
			"",
			`${this.dataset.url}?variant=${this.currentVariant.id}`
		);
	}

	updateVariantInput() {
		const productForms = document.querySelectorAll(
			`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
		);
		productForms.forEach((productForm) => {
			const input = productForm.querySelector('input[name="id"]');
			input.value = this.currentVariant.id;
			input.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}

	updateVariantStatuses() {
		const selectedOptionOneVariants = this.variantData.filter(
			(variant) => this.querySelector(":checked").value === variant.option1
		);
		const inputWrappers = [...this.querySelectorAll(".product-form__input")];
		inputWrappers.forEach((option, index) => {
			if (index === 0) return;
			const optionInputs = [
				...option.querySelectorAll('input[type="radio"], option'),
			];
			const previousOptionSelected =
				inputWrappers[index - 1].querySelector(":checked").value;
			const availableOptionInputsValue = selectedOptionOneVariants
				.filter(
					(variant) =>
						variant.available &&
						variant[`option${index}`] === previousOptionSelected
				)
				.map((variantOption) => variantOption[`option${index + 1}`]);
			this.setInputAvailability(optionInputs, availableOptionInputsValue);
		});
	}

	setInputAvailability(listOfOptions, listOfAvailableOptions) {
		listOfOptions.forEach((input) => {
			if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
				if (input.tagName === "OPTION") {
					input.innerText = input.getAttribute("value");
				} else if (input.tagName === "INPUT") {
					input.classList.remove("disabled");
				}
			} else {
				if (input.tagName === "OPTION") {
					input.innerText =
						window.variantStrings.unavailable_with_option.replace(
							"[value]",
							input.getAttribute("value")
						);
				} else if (input.tagName === "INPUT") {
					input.classList.add("disabled");
				}
			}
		});
	}

	updatePickupAvailability() {
		const pickUpAvailability = document.querySelector("pickup-availability");
		if (!pickUpAvailability) return;

		if (this.currentVariant && this.currentVariant.available) {
			pickUpAvailability.fetchAvailability(this.currentVariant.id);
		} else {
			pickUpAvailability.removeAttribute("available");
			pickUpAvailability.innerHTML = "";
		}
	}

	renderProductInfo() {
		const requestedVariantId = this.currentVariant.id;
		const sectionId = this.dataset.originalSection
			? this.dataset.originalSection
			: this.dataset.section;

		fetch(
			`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${
				this.dataset.originalSection
					? this.dataset.originalSection
					: this.dataset.section
			}`
		)
			.then((response) => response.text())
			.then((responseText) => {
				// prevent unnecessary ui changes from abandoned selections
				if (this.currentVariant.id !== requestedVariantId) return;

				const html = new DOMParser().parseFromString(responseText, "text/html");
				const destination = document.getElementById(
					`price-${this.dataset.section}`
				);
				const source = html.getElementById(
					`price-${
						this.dataset.originalSection
							? this.dataset.originalSection
							: this.dataset.section
					}`
				);
				const skuSource = html.getElementById(
					`Sku-${
						this.dataset.originalSection
							? this.dataset.originalSection
							: this.dataset.section
					}`
				);
				const skuDestination = document.getElementById(
					`Sku-${this.dataset.section}`
				);
				const inventorySource = html.getElementById(
					`Inventory-${
						this.dataset.originalSection
							? this.dataset.originalSection
							: this.dataset.section
					}`
				);
				const inventoryDestination = document.getElementById(
					`Inventory-${this.dataset.section}`
				);

				if (source && destination) destination.innerHTML = source.innerHTML;
				if (inventorySource && inventoryDestination)
					inventoryDestination.innerHTML = inventorySource.innerHTML;
				if (skuSource && skuDestination) {
					skuDestination.innerHTML = skuSource.innerHTML;
					skuDestination.classList.toggle(
						"visibility-hidden",
						skuSource.classList.contains("visibility-hidden")
					);
				}

				const price = document.getElementById(`price-${this.dataset.section}`);

				if (price) price.classList.remove("visibility-hidden");

				if (inventoryDestination)
					inventoryDestination.classList.toggle(
						"visibility-hidden",
						inventorySource.innerText === ""
					);

				const addButtonUpdated = html.getElementById(
					`ProductSubmitButton-${sectionId}`
				);
				this.toggleAddButton(
					addButtonUpdated ? addButtonUpdated.hasAttribute("disabled") : true,
					window.variantStrings.soldOut
				);
			});
	}

	toggleAddButton(disable = true, text, modifyClass = true) {
		const productForm = document.getElementById(
			`product-form-${this.dataset.section}`
		);
		if (!productForm) return;
		const addButton = productForm.querySelector('[name="add"]');
		const addButtonText = productForm.querySelectorAll('[name="add"] > span');
		const notifyButton = document.getElementById(
			`notify-button-${this.dataset.section}`
		);

		if (!addButton) return;

		if (disable) {
			addButton.setAttribute("disabled", "disabled");
			//notifyButton?.setAttribute("disabled", "disabled");

			if (text) {
				addButtonText.forEach((elem) => {
					elem.innerHTML = `${text}`;
				});
			}
			if (text) notifyButton?.setAttribute("disabled", "disabled");
		} else {
			addButton.removeAttribute("disabled");
			notifyButton?.removeAttribute("disabled");
			addButtonText.forEach((elem) => {
				elem.innerHTML = `${window.variantStrings.addToCart}`;
			});
		}

		if (!modifyClass) return;
	}

	setUnavailable() {
		const button = document.getElementById(
			`product-form-${this.dataset.section}`
		);
		const addButton = button.querySelector('[name="add"]');
		const addButtonText = button.querySelectorAll('[name="add"] > span');
		const price = document.getElementById(`price-${this.dataset.section}`);
		const inventory = document.getElementById(
			`Inventory-${this.dataset.section}`
		);
		const sku = document.getElementById(`Sku-${this.dataset.section}`);
		if (!addButton) return;
		addButtonText.forEach((elem) => {
			elem.innerHTML = `${window.variantStrings.unavailable}`;
		});
		if (price) price.classList.add("visibility-hidden");
		if (inventory) inventory.classList.add("visibility-hidden");
		if (sku) sku.classList.add("visibility-hidden");
	}

	getVariantData() {
		this.variantData =
			this.variantData ||
			JSON.parse(this.querySelector('[type="application/json"]').textContent);
		return this.variantData;
	}
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
	constructor() {
		super();
	}

	setInputAvailability(listOfOptions, listOfAvailableOptions) {
		listOfOptions.forEach((input) => {
			if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
				input.classList.remove("disabled");
			} else {
				input.classList.add("disabled");
			}
		});
	}

	updateOptions() {
		const fieldsets = Array.from(this.querySelectorAll("fieldset"));
		this.options = fieldsets.map((fieldset) => {
			return Array.from(fieldset.querySelectorAll("input")).find(
				(radio) => radio.checked
			).value;
		});
	}
}

customElements.define("variant-radios", VariantRadios);

class ProductModel extends DeferredMedia {
	constructor() {
		super();
	}

	loadContent() {
		super.loadContent();

		Shopify.loadFeatures([
			{
				name: "model-viewer-ui",
				version: "1.0",
				onLoad: this.setupModelViewerUI.bind(this),
			},
		]);
	}

	setupModelViewerUI(errors) {
		if (errors) return;

		this.modelViewerUI = new Shopify.ModelViewerUI(
			this.querySelector("model-viewer")
		);

		const $this = this;

		this.querySelector(".shopify-model-viewer-ui__button").addEventListener(
			"click",
			function () {
				if (
					$this
						.closest(".swiper")
						.swiper.slides[
							$this.closest(".swiper").swiper.activeIndex
						].querySelector("model-viewer")
				) {
					if (
						!$this
							.closest(".swiper")
							.swiper.slides[
								$this.closest(".swiper").swiper.activeIndex
							].querySelector("model-viewer")
							.classList.contains("shopify-model-viewer-ui__disabled")
					) {
						if (
							$this
								.querySelector(".shopify-model-viewer-ui__button")
								.hasAttribute("hidden")
						) {
							$this.closest(".swiper").swiper.params.noSwiping = true;
							$this.closest(".swiper").swiper.params.noSwipingClass =
								"swiper-slide";
						}
					}
				}
			}
		);

		this.querySelector(
			".shopify-model-viewer-ui__controls-overlay"
		).addEventListener("click", function () {
			if (
				!$this
					.querySelector(".shopify-model-viewer-ui__button")
					.hasAttribute("hidden")
			) {
				$this.closest(".swiper").swiper.params.noSwiping = false;
			}
		});
	}
}
customElements.define("product-model", ProductModel);

// Product slider

//(function () {
//	const productSlider = () => {
//		const productSliders = Array.from(
//			document.querySelectorAll(".products-slider")
//		);
//		if (productSliders.length === 0) return;
//		productSliders.forEach((slider) => {
//			const sectionId = slider.dataset.id;
//			const perRow = slider.dataset.perRow;
//			const mobileR = slider.dataset.mobile;
//			const speed = slider.dataset.speed * 1000;
//			const delay = slider.dataset.delay * 1000;
//			const autoplay = toBoolean(slider.dataset.autoplay);
//			const stopAutoplay = toBoolean(slider.dataset.stopAutoplay);
//			const showArrows = toBoolean(slider.dataset.showArrows);
//			let autoplayParm = {};
//			let arrowsParm = {};

//			if (autoplay) {
//				autoplayParm = {
//					autoplay: {
//						delay: delay,
//						pauseOnMouseEnter: stopAutoplay,
//						disableOnInteraction: false,
//					},
//				};
//			}
//			if (showArrows) {
//				arrowsParm = {
//					navigation: {
//						nextEl: `#${sectionId} .swiper-button-next`,
//						prevEl: `#${sectionId} .swiper-button-prev`,
//					},
//					pagination: {
//						el: `#${sectionId} .swiper-pagination`,
//						clickable: true,
//						type: "bullets",
//						renderBullet: function (activeIndex, className) {
//							return (
//								'<span class="' +
//								className +
//								'">' +
//								"<em>" +
//								"</em>" +
//								"</span>"
//							);
//						},
//					},
//				};
//			}
//			let swiperParms = {
//				speed: speed,
//				keyboard: true,
//				slidesPerView: mobileR,
//				slidesPerGroup: mobileR,
//				spaceBetween: 16,
//				breakpoints: {
//					576: {
//						slidesPerView: 2,
//						slidesPerGroup: 2,
//					},
//					990: {
//						slidesPerView: 3,
//						slidesPerGroup: 3,
//					},
//					1200: {
//						spaceBetween: 16,
//						slidesPerView: perRow,
//						slidesPerGroup: perRow,
//					},
//				},
//				...arrowsParm,
//				...autoplayParm,
//			};

//			const swiper = new Swiper(`#${sectionId} .swiper`, swiperParms);
//		});
//	};

//	function toBoolean(string) {
//		return string === "true" ? true : false;
//	}
//	if (document.querySelector("product-recommendations") !== null) {
//		const initslider = setInterval(() => {
//			if (
//				document
//					.querySelector("product-recommendations")
//					.querySelector(".swiper") !== null
//			) {
//				if (
//					document
//						.querySelector("product-recommendations")
//						.querySelector(".swiper")
//						.classList.contains("swiper-initialized")
//				) {
//					clearInterval(initslider);
//				}
//				productSlider();
//			}
//		}, 100);
//	}
//	document.addEventListener("DOMContentLoaded", function () {
//		productSlider();
//		document.addEventListener("shopify:section:load", function () {
//			productSlider();
//		});
//	});
//})();

(function () {
	const hoverOpacity = () => {
		$("[data-hover-opacity]").hover(
			function () {
				const id = $(this).data("hover-opacity");
				$(`[data-hover-opacity=${id}]`).addClass("opacity");
				$(this).removeClass("opacity");
			},
			function () {
				const id = $(this).data("hover-opacity");
				$(`[data-hover-opacity=${id}]`).removeClass("opacity");
			}
		);
	};
	document.addEventListener("DOMContentLoaded", function () {
		hoverOpacity();
		document.addEventListener("shopify:section:load", function () {
			hoverOpacity();
		});
	});
})();

(function () {
	const sidebar = () => {
		let pageNav = $(".product-details");

		if (pageNav.length > 0) {
			let pageNavList = pageNav.find("a");
			let adminBarHeight = 0;

			let headings = [];
			for (let i = 0; i < pageNavList.length; i++) {
				headings[i] = $($(pageNavList[i]).attr("href"));
			}

			$(pageNavList[0]).addClass("active");

			$(window).on("scroll", function () {
				for (let i = headings.length; i >= 0; i--) {
					if ($(headings[i]).length > 0) {
						if (
							$(headings[i]).offset().top - 50 <=
							$(window).scrollTop() + adminBarHeight
						) {
							if (!$(pageNavList[i]).hasClass("active")) {
								let hasActiveItem = false;
								for (let j = i; j < headings.length; j++) {
									if ($(pageNavList[j]).hasClass("active")) {
										hasActiveItem = true;
									}
								}

								if (!hasActiveItem) {
									$(pageNavList[i]).addClass("active");
									if ($(pageNavList[i]).hasClass("product-details-nav-item")) {
									}

									history.pushState(
										null,
										null,
										window.location.origin +
											window.location.pathname +
											$(pageNavList[i]).attr("href")
									);
								}
							} else {
								for (let j = 0; j < i; j++) {
									$(pageNavList[j]).removeClass("active");
								}
							}
						} else {
							if (i !== 0) {
								$(pageNavList[i]).removeClass("active");
							}
						}
					}
				}
			});
		}
	};
	document.addEventListener("DOMContentLoaded", function () {
		sidebar();
		document.addEventListener("shopify:section:load", function () {
			sidebar();
		});
	});
})();

//(function () {
//	const imageAnimation = () => {
//		const images = document.querySelectorAll("[animation-images]");
//		observer = new IntersectionObserver((entries, observer) => {
//			entries.forEach((entry) => {
//				entry.isIntersecting &&
//					(entry.target.classList.add("transition"),
//					setTimeout(() => entry.target.classList.remove("clipped"), 5),
//					observer.unobserve(entry.target));
//			});
//		});
//		images.forEach((image) => {
//			const wrapper = image.closest(".photowrapper");
//			noClip = image.dataset.noclip;
//			if (noClip != "true") {
//				wrapper &&
//					(wrapper.classList.add("clipped"), observer.observe(wrapper));
//			} else {
//				wrapper &&
//					(wrapper.classList.add("clipped"),
//					noClip && wrapper.classList.add("noclip"),
//					observer.observe(wrapper));
//			}
//		});
//	};
//	document.addEventListener("DOMContentLoaded", function () {
//		imageAnimation();
//		document.addEventListener("shopify:section:load", function () {
//			imageAnimation();
//		});
//	});
//})();

(function () {
	const initDrawerAccordion = () => {
		$(".drawer__accordion-title").click(function () {
			if ($(this).hasClass("second_level")) {
				$(this).toggleClass("active");
			} else {
				if (!$(this).hasClass("active")) {
					$(".drawer__accordion-title.first_level.active").removeClass("active");
					$(this).addClass("active");
				} else {
					$(this).removeClass("active");
				}
			}
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		initDrawerAccordion();
		document.addEventListener("shopify:section:load", function () {
			initDrawerAccordion();
		});
	});
})();

//(function () {
//	const productTextAnimation = () => {
//		const richTextSections = document.querySelectorAll(
//			".product-subheading-animation"
//		);
//		richTextSections.forEach((richTextSection) => {
//			if (richTextSection.classList.contains("js-init")) {
//				return "";
//			}
//			richTextSection.classList.add("js-init");
//			const elem = richTextSection.querySelector(
//				".product__subheading-animation"
//			);
//			const text = elem.dataset.text;
//			const delay = 100;

//			let print_text = function (text, elem, delay) {
//				if (text.length > 0) {
//					elem.innerHTML += text[0];
//					setTimeout(function () {
//						print_text(text.slice(1), elem, delay);
//					}, delay);
//				}
//			};
//			const observer = new IntersectionObserver((entries) => {
//				entries.forEach((entry) => {
//					if (entry.isIntersecting) {
//						if (elem.classList.contains("js-text-init")) {
//							return "";
//						}
//						elem.classList.add("js-text-init");
//						print_text(text, elem, delay);
//						return;
//					}
//					//elem.innerHTML = "";
//				});
//			});
//			observer.observe(elem);
//		});
//	};
//	document.addEventListener("DOMContentLoaded", function () {
//		productTextAnimation();
//		document.addEventListener("shopify:section:load", function () {
//			productTextAnimation();
//		});
//	});
//})();

(function () {
	const textAnimation = () => {
			const elements = document.querySelectorAll('[data-animation-text="true"]');
			
			elements.forEach(element => {
				const observer = new IntersectionObserver((entries) => {
						entries.forEach((entry) => {
								if (entry.isIntersecting) {
										observer.unobserve(element);
										animateText(element);
								}
						});
				});

				observer.observe(element);
		});
	};

	const animateText = (element) => {
			const word = element.textContent.trim();
			element.innerHTML = '';

			const charsArray = [];
			for (let char of word) {
					if (char === ' ') {
							element.appendChild(document.createTextNode(' '));
					} else {
							const span = document.createElement('span');
							span.className = 'char';
							span.textContent = char;
							element.appendChild(span);
							charsArray.push(span);
					}
			}

			gsap.set(element, { opacity: 1 });
			shuffleArray(charsArray);

			let delay = 0.1;
			charsArray.forEach((char, index) => {
					gsap.to(char, {
							opacity: 1,
							duration: 0.5,
							delay: delay * index,
							ease: "power3.out"
					});
			});

			gsap.to(element, {
					opacity: 1,
					duration: 0.5,
					delay: delay * word.length,
					ease: "power3.out"
			});
	};

	const shuffleArray = (array) => {
			for (let i = array.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[array[i], array[j]] = [array[j], array[i]];
			}
	};

	document.addEventListener("DOMContentLoaded", function () {
			textAnimation();
	});

	document.addEventListener("shopify:section:load", function () {
			textAnimation();
	});
})();


function buttonHoverEffects() {
	function wrapLetters(element) {
		const text = element.textContent.trim();
		element.innerHTML = '';
		const words = text.split(' ');
		words.forEach((word, index) => {
			const wordSpan = document.createElement('span');
			for (let char of word) {
				const charSpan = document.createElement('span');
				charSpan.className = 'char';
				charSpan.textContent = char;
				wordSpan.appendChild(charSpan);
			}
			element.appendChild(wordSpan);
			if (index < words.length - 1) {
				element.appendChild(document.createTextNode(' '));
			}
		});
	}

	document.querySelectorAll("[hoverstagger='text']").forEach(wrapLetters);

	document.querySelectorAll(".button, .button-animation").forEach(function (button) {
		let link = button.querySelector("[hoverstagger='link']");
		if (!link) return;

		let text1 = link.querySelectorAll("[hoverstagger='text']")[0];
		let text2 = link.querySelectorAll("[hoverstagger='text']")[1];

		if (!text1 || !text2) return;

		let tl = gsap.timeline({
			paused: true,
			defaults: {
				duration: 0.7,
				ease: 'power2.out',
			},
		});

		tl.fromTo(
			text1.querySelectorAll('.char:nth-child(odd)'),
			{ yPercent: 100 },
			{ yPercent: 0 }
		);
		tl.fromTo(
			text2.querySelectorAll('.char:nth-child(odd)'),
			{ yPercent: 0 },
			{ yPercent: -100 },
			0
		);
		tl.fromTo(
			text1.querySelectorAll('.char:nth-child(even)'),
			{ yPercent: 0 },
			{ yPercent: 100 },
			0
		);
		tl.fromTo(
			text2.querySelectorAll('.char:nth-child(even)'),
			{ yPercent: -100 },
			{ yPercent: 0 },
			0
		);

		button.addEventListener('mouseenter', function () {
			if (window.innerWidth > 768 && button.getAttribute('aria-disabled') !== 'true') {
				tl.restart();
			}
		});
	});
}

document.addEventListener('DOMContentLoaded', buttonHoverEffects);
document.addEventListener('shopify:section:load', buttonHoverEffects);

function formatMoney(cents, format = "") {
	if (typeof cents === "string") {
		cents = cents.replace(".", "");
	}
	let value = "";
	const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
	const formatString = format || theme.moneyFormat;

	function formatWithDelimiters(
		number,
		precision = 2,
		thousands = ",",
		decimal = ".",
	) {
		if (isNaN(number) || number == null) {
			return 0;
		}

		number = (number / 100.0).toFixed(precision);

		const parts = number.split(".");
		const dollarsAmount = parts[0].replace(
			/(\d)(?=(\d\d\d)+(?!\d))/g,
			`$1${thousands}`,
		);
		const centsAmount = parts[1] ? decimal + parts[1] : "";

		return dollarsAmount + centsAmount;
	}

	switch (formatString.match(placeholderRegex)[1]) {
		case "amount":
			value = formatWithDelimiters(cents, 2);
			break;
		case "amount_no_decimals":
			value = formatWithDelimiters(cents, 0);
			break;
		case "amount_with_comma_separator":
			value = formatWithDelimiters(cents, 2, ".", ",");
			break;
		case "amount_no_decimals_with_comma_separator":
			value = formatWithDelimiters(cents, 0, ".", ",");
			break;
	}

	return formatString.replace(placeholderRegex, value);
}


(function () {
	const selectDropDown = () => {
		$(".product-form__controls--dropdown").each(function () {
			const elListItem = $(this).find(".dropdown-select ul li");
			const elItem = $(this).find(".dropdown-select ul");
			const selectedText = $(this).find(".dropdown-select .select-label");

			selectedText.on("click", function (e) {
				elItem.toggleClass("active");
				if (elItem.hasClass("active")) {
					e.stopPropagation();
					$(document).click(function () {
						elItem.removeClass("active");
					});
				}
			});

			elListItem.on("click", function () {
				selectedText
					.find("span")
					.text($(this).text())
					.attr("title", $(this).text());
				elItem.removeClass("active");
				document.activeElement.blur();
			});
		});
	};
	document.addEventListener("DOMContentLoaded", function () {
		selectDropDown();
		document.addEventListener("shopify:section:load", function () {
			selectDropDown();
		});
	});
})();
