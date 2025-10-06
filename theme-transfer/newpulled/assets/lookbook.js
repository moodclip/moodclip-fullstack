(function () {
	const lookbook = () => {
		$(".lookbook-section").each(function () {
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			const id = $(this).attr("id");
			const box = $(this).find(".lookbook");
			const autoplay = box.data("autoplay");
			const stopAutoplay = box.data("stop-autoplay");

			if (autoplay) {
				autoplayParm = {
					autoplay: {
						delay: delay,
						pauseOnMouseEnter: stopAutoplay,
						disableOnInteraction: false,
					},
				};
			} else {
				autoplayParm = {};
			}
			let swiperParms = {
				slidesPerView: 1.2,
				spaceBetween: 0,
				mousewheel: {
					releaseOnEdges: true,
				},
				breakpoints: {
					//576: {
					//	slidesPerView: 2,
					//	spaceBetween: 16,
					//},
					990: {
						slidesPerView: 2.5,
						spaceBetween: 0,
					},
				},
				autoHeight: false,
				calculateHeight: false,
				keyboard: true,
				navigation: {
					nextEl: `#${id} .swiper-button-next`,
					prevEl: `#${id} .swiper-button-prev`,
				},
				pagination: {
					el: `#${id} .swiper-pagination`,
					clickable: true,
				},
				...autoplayParm,
			};
			const swiper = new Swiper(`#${id} .swiper`, swiperParms);
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		lookbook();
	});
	document.addEventListener("shopify:section:load", function () {
		lookbook();
	});
})();
