(function () {
	const productSlider = () => {
		const productSliders = Array.from(
			document.querySelectorAll(".products-slider")
		);
		if (productSliders.length === 0) return;
		productSliders.forEach((slider) => {
			if (slider.classList.contains("slider_started")) {
				return "";
			}
			slider.classList.add("slider_started");

			const sectionId = slider.dataset.id;

			const perRow = slider.dataset.perRow;
			const mobile = slider.dataset.mobile;
			const speed = slider.dataset.speed * 1000;
			const delay = slider.dataset.delay * 1000;
			const autoplay = toBoolean(slider.dataset.autoplay);
			const stopAutoplay = toBoolean(slider.dataset.stopAutoplay);
			const showArrows = toBoolean(slider.dataset.showArrows);
			let autoplayParm = {};
			let arrowsParm = {};
			if (autoplay) {
				autoplayParm = {
					autoplay: {
						delay: delay,
						pauseOnMouseEnter: stopAutoplay,
						disableOnInteraction: false,
					},
				};
			}
			if (showArrows) {
				arrowsParm = {
					navigation: {
						nextEl: `#${sectionId} .swiper-button-next`,
						prevEl: `#${sectionId} .swiper-button-prev`,
					},
					pagination: {
						el: `#${sectionId} .products-slider-pagination`,
						clickable: true,
					},
				};
			}
			let swiperParms = {
				speed: speed,

				keyboard: true,
				slidesPerView: mobile,
				spaceBetween: 16,
				breakpoints: {
					576: {
						slidesPerView: perRow >= 2 ? 2 : 1,
					},
					750: {
						slidesPerView: perRow >= 3 ? 3 : perRow,
					},
					990: {
						slidesPerView: perRow >= 4 ? 4 : perRow,
					},
					1200: {
						spaceBetween: 16,
						slidesPerView: perRow,
					},
				},
				...arrowsParm,
				...autoplayParm,
			};

			const swiper = new Swiper(`#${sectionId} .swiper`, swiperParms);
		});
	};

	function toBoolean(string) {
		return string === "true" ? true : false;
	}
	if (document.querySelector("product-recommendations") !== null) {
		const initslider = setInterval(() => {
			if (
				document
					.querySelector("product-recommendations")
					.querySelector(".swiper") !== null
			) {
				if (
					document
						.querySelector("product-recommendations")
						.querySelector(".swiper")
						.classList.contains("swiper-initialized")
				) {
					clearInterval(initslider);
				}
				productSlider();
			}
		}, 100);
	}
	document.addEventListener("DOMContentLoaded", function () {
		productSlider();
		document.addEventListener("shopify:section:load", function () {
			productSlider();
		});
	});
})();
