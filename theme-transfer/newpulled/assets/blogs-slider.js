(function() {
	const initBlogsSliders = () => {
		$(".featured-blogs").each(function() {
			if ($(this).hasClass("slider_started")) {
				return;
			}
			$(this).addClass("slider_started");
			const id = $(this).data("id");
			const autoplay = $(this).data("autoplay");
			const delay = $(this).data("delay") * 1000;
			const perRow = $(this).data("per_row");
			const mobileSliderPerRow = $(this).data("mobile-slider-per-row");

			if (mobileSliderPerRow) {
        breakpoints = {
          576: {
            slidesPerView: 1,
          },
          1200: {
            slidesPerView: perRow,
          },
        };
      } else {
        breakpoints = {
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
            slidesPerView: perRow,
          },
        };
      }

			let swiperParams = {
				speed: $(this).data("speed") * 1000,
				slidesPerView: 1,
				spaceBetween: 16,
				loop: false,
				navigation: {
					nextEl: `#${id} .swiper-button-next`,
					prevEl: `#${id} .swiper-button-prev`,
				},
				pagination: {
					el: `#${id} .swiper-pagination`,
					clickable: true,
				},
				breakpoints: breakpoints,
			};

			if (autoplay) {
				swiperParams.autoplay = {
					delay: delay,
					pauseOnMouseEnter: true,
					disableOnInteraction: false,
				};
			}

			new Swiper(`#${id} .swiper`, swiperParams);
		});
	};

	document.addEventListener("DOMContentLoaded", function() {
		initBlogsSliders();
		document.addEventListener("shopify:section:load", function () {
			initBlogsSliders();
		});
	});
})();