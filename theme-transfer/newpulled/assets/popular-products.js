(function () {
	const productSlider = () => {
		function toBoolean(string) {
			return string === "true" ? true : false;
		}

		const sections = document.querySelectorAll(".popular-products");

		sections.forEach(function (section) {
			const wrapper = section.querySelector(".popular-products-slider");
			const productWrapper = section.querySelector(
				".popular-products__wrapper"
			);
			const buttonNext = section.querySelector(".swiper-button-next");
			const swiperSlide = section.querySelectorAll(".swiper-slide");
			let count = 4.4;

			createOffsets();

			window.addEventListener("resize", createOffsets);

			function createOffsets() {
				const offset =
					(document.body.offsetWidth -
						section.querySelector(".popular-products-progressbar")
							.offsetWidth) /
					2;

				if (wrapper.dataset.count <= 4 && wrapper.dataset.count != 0) {
					count = 4;

					function changeMediaQueries(mediaQueries) {
						if (mediaQueries.matches) {
							productWrapper.style.marginRight = 0;
						} else {
							productWrapper.style.marginRight = offset + "px";
						}
					}

					var mediaQueries = window.matchMedia("(max-width: 1200px)");
					changeMediaQueries(mediaQueries);
					mediaQueries.addEventListener("change", function () {
						changeMediaQueries(mediaQueries);
					});
				}

				productWrapper.style.marginLeft = offset + "px";

				const sectionId = wrapper.dataset.id;
				const speed = wrapper.dataset.speed * 1000;
				const delay = wrapper.dataset.delay * 1000;
				const autoplay = toBoolean(wrapper.dataset.autoplay);
				const stopAutoplay = toBoolean(wrapper.dataset.stopAutoplay);
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
				const swiperParms = {
					speed: speed,
					keyboard: true,
					slidesPerView: 1.4,
					spaceBetween: 16,
					on: {
						slideChange: function () {
							if (this.activeIndex === 0) {
								productWrapper.style.marginLeft = offset + "px";
								productWrapper.style.marginRight = 0 + "px";
								productWrapper.style.transition = `margin 500ms`;
								Array.from(swiperSlide).forEach((element) => {
									element.style.transform = "translateX(0)";
								});
							} else {
								if (this.activeIndex > this.previousIndex) {
									productWrapper.style.marginRight = offset + "px";
									productWrapper.style.marginLeft = 0 + "px";
									productWrapper.style.transition = `margin 500ms`;
									Array.from(swiperSlide).forEach((element) => {
										if (
											buttonNext.classList.contains("swiper-button-disabled")
										) {
											element.style.transform = "translateX(0)";
										} else {
											element.style.transform =
												"translateX(calc(40% + 1.6rem))";
										}
									});
								} else {
									productWrapper.style.marginLeft = offset + "px";
									productWrapper.style.marginRight = 0 + "px";
									productWrapper.style.transition = `margin 500ms`;
									Array.from(swiperSlide).forEach((element) => {
										element.style.transform = "translateX(0)";
									});
								}
							}
						},
					},
					navigation: {
						nextEl: `#${sectionId} .swiper-button-next`,
						prevEl: `#${sectionId} .swiper-button-prev`,
					},
					pagination: {
						el: `#${sectionId} .swiper-pagination`,
						type: "progressbar",
					},
					breakpoints: {
						576: {
							slidesPerView: 2.4,
						},
						990: {
							slidesPerView: 3.4,
						},
						1200: {
							slidesPerView: count,
						},
					},
					...autoplayParm,
				};
				const swiper = new Swiper(`#${sectionId} .swiper`, swiperParms);
			}
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		productSlider();
		document.addEventListener("shopify:section:load", function () {
			productSlider();
		});
	});
})();
