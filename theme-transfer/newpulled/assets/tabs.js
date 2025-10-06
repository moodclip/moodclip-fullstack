(function () {
	const initSliders = () => {
		$(".tabs-section").each(function () {
			if ($(this).hasClass("slider_started")) {
				return;
			}
			$(this).addClass("slider_started");
			const id = $(this).attr("id");
			const box = $(this).find(".tabs");
			const autoplay = box.data("autoplay");
			const delay = box.data("delay") * 1000;

			let swiperParms = {
				effect: box.data("effect"),
				speed: box.data("speed") * 1000,
				slidesPerView: 1,
				autoHeight: false,
				keyboard: true,
				loop: false,
				watchSlidesProgress: true,
				allowTouchMove: false,
			};

			if (autoplay) {
				swiperParms.autoplay = {
					delay: delay,
					disableOnInteraction: false,
				};
			}

			const mainSwiper = new Swiper(`#${id} .tabs_box`, swiperParms);
			let secondSwiperElement = $(this).find(".tabs_box-content");
			if (secondSwiperElement.length > 0) {
				const secondSwiper = new Swiper(
					`#${id} .tabs_box-content`,
					swiperParms
				);
				mainSwiper.on("slideChange", function () {
					secondSwiper.slideTo(mainSwiper.activeIndex);
				});
				secondSwiper.on("slideChange", function () {
					mainSwiper.slideTo(secondSwiper.activeIndex);
				});
			}

			const sliderThumbs = new Swiper(`#${id} .tabs-thumb_wrapper`, {
				spaceBetween: 16,
				slidesPerView:
					$(this).find(".tabs_wrapper-type3").length > 0
						? box.data("per-row")
						: 1.4,
				speed: box.data("speed") * 1000,
				freeMode: false,
				allowTouchMove: true,
				watchSlidesVisibility: true,
				watchSlidesProgress: true,
				watchOverflow: true,
				loop: false,
				breakpoints: {
					576: {
						slidesPerView:
							$(this).find(".tabs_wrapper-type3").length > 0
								? box.data("per-row")
								: 2.2,
					},
					990: {
						slidesPerView: box.data("per-row"),
						allowTouchMove: false,
					},
				},
			});

			function updateActiveSlide(mainSwiper, sliderThumbs) {
				let activeIndex = mainSwiper.activeIndex;
				if (mainSwiper.params.loop) {
					activeIndex = mainSwiper.realIndex;
				}
				const activeThumb = sliderThumbs.slides[activeIndex];
				sliderThumbs.slides.forEach(function (slide) {
					slide.classList.remove("active");
				});
				activeThumb.classList.add("active");
			}

			function updateThumbs(activeIndex) {
				sliderThumbs.slideTo(activeIndex);
				sliderThumbs.slides.forEach((slide, index) => {
					slide.classList.toggle("active", index === activeIndex);
				});
			}

			mainSwiper.on("slideChange", function () {
				updateActiveSlide(mainSwiper, sliderThumbs);
				const activeIndex = mainSwiper.realIndex;
				updateThumbs(activeIndex);
				if (
					mainSwiper.isEnd &&
					mainSwiper.realIndex !== mainSwiper.slides.length - 1
				) {
					mainSwiper.slideTo(0);
				}
			});

			sliderThumbs.on("click", function (e) {
				const clickedIndex = sliderThumbs.clickedIndex;
				if (clickedIndex != null) {
					mainSwiper.slideTo(clickedIndex);
					sliderThumbs.slideTo(clickedIndex);
				}
			});

			sliderThumbs.slides[0].classList.add("active");
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		initSliders();
		document.addEventListener("shopify:section:load", function () {
			initSliders();
		});
	});
})();
