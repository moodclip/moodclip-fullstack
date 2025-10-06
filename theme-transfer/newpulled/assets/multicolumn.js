(function () {
	let swiperMulticolumn;
	const multicolumnSwipeEnabled = document.querySelector(
		".swiper--multicolumn"
	);

	const initSlider = () => {
		multicolumnSwipeEnabled.classList.add("multicolumn-swiper-wrapper");
		const slides = document.querySelectorAll(".multicolumn-list__item");

		slides.forEach((slide) => {
			slide.classList.add("swiper-slide");
		});

		swiperMulticolumn = new Swiper(".swiper--multicolumn", {
			loop: false,
			slidesPerView: 1,
			spaceBetween: 0,
			navigation: {
				nextEl: ".multicolumn-button-next",
				prevEl: ".multicolumn-button-prev",
			},
			breakpoints: {
				576: {
					slidesPerView: 2,
				},
			},
		});
	};

	const destroySlider = () => {
		multicolumnSwipeEnabled.classList.remove("multicolumn-swiper-wrapper");
		const slides = document.querySelectorAll(".multicolumn-list__item");

		swiperMulticolumn.destroy(true, true);
		swiperMulticolumn = undefined;

		slides.forEach((slide) => {
			slide.removeAttribute("style");
			slide.classList.remove("swiper-slide");
		});
	};

	const initMulticolumn = () => {
		const multicolumnSection = document.querySelector(".multicolumn-section");

		const sectionResizeObserver = new ResizeObserver((entries) => {
			const [entry] = entries;

			if (entry.contentRect.width < 576 && multicolumnSwipeEnabled) {
				initSlider();
			} else if (swiperMulticolumn) {
				destroySlider();
			}
		});

		sectionResizeObserver.observe(multicolumnSection);
	};

	if (swiperMulticolumn) {
		destroySlider();
	}
	initMulticolumn();
	document.addEventListener("shopify:section:load", function () {
		if (swiperMulticolumn) {
			destroySlider();
		}
		initMulticolumn();
	});
})();
