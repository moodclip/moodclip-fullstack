(function () {
	const flickityCarousel = () => {
		$(".flickity-carousel-section").each(function () {
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			const id = $(this).attr("id");
			const box = $(this).find(".flickity-carousel");
			const autoplay = box.data("autoplay");
			const speed = box.data("speed") * 1000;
			const stopAutoplay = box.data("stop-autoplay");
			const delay = box.data("delay") * 1000;
			const blockSize = box.data("blocks-size");

			let size = false;
			if (blockSize > 3) {
				size = true;
			}

			let autoplayParm = {};
			if (autoplay) {
				autoplayParm = {
					autoplay: {
						delay: delay,
						pauseOnMouseEnter: stopAutoplay,
						disableOnInteraction: false,
					},
				};
			}

			let swiperParms = {
				speed: speed,
				slidesPerView: 2,
				centeredSlides: true,
				spaceBetween: 20,
				loop: size,
				//loopAdditionalSlides: 3,
				loopPreventsSliding: false,
				//loopedSlides: 3,
				//initialSlide: 3,
				breakpoints: {
					576: {
						spaceBetween: 150,
						slidesPerView: 2.5,
					},
					990: {
						spaceBetween: 240,
						slidesPerView: 2.5,
					},
					1400: {
						spaceBetween: 290,
						slidesPerView: 2.5,
					},
					1600: {
						spaceBetween: 590,
						slidesPerView: 2.5,
					},
				},
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

	
			gsap.fromTo(
				`#${id} .swiper-slide`,
				{ opacity: 0, y: 50 },
				{ opacity: 1, y: 0, duration: 0.5, stagger: 0.2 }
			);

			gsap.to(`#${id} .swiper-slide-prev, #${id} .swiper-slide-next`, {
				scale: 0.8,
				duration: delay / 1000,
			});

			swiper.on("slideChangeTransitionStart", function () {
				gsap.to(`#${id} .swiper-slide`, { scale: 1, duration: delay / 1000 });
				gsap.to(`#${id} .swiper-slide-prev, #${id} .swiper-slide-next`, {
					scale: 0.8,
					duration: delay / 1000,
				});
			});
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		flickityCarousel();
		document.addEventListener("shopify:section:load", function () {
			flickityCarousel();
		});
	});
})();
