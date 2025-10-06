(function () {
	const mainBlogSlider = () => {
		const blogSliders = Array.from(
			document.querySelectorAll(".blog-articles-large")
		);

		if (blogSliders.length === 0) return;
		blogSliders.forEach((slider) => {
			const sectionId = slider.dataset.id;
			const speed = slider.dataset.speed * 1000;
			const buttonNext = document.querySelector(
				`#${sectionId} .swiper-button-next`
			);

			let arrowsParm = {
				navigation: {
					nextEl: `#${sectionId} .swiper-button-next`,
					prevEl: `#${sectionId} .swiper-button-prev`,
				},
				pagination: {
					el: `#${sectionId} .swiper-pagination`,
					type: "progressbar",
				},
			};

			let swiperParms = {
				speed: speed,
				keyboard: true,
				slidesPerView: 1,
				spaceBetween: 16,
				breakpoints: {
					576: {
						slidesPerView: 2,
					},
					990: {
						slidesPerView: 3,
					},
				},
				...arrowsParm,
			};

			const swiper = new Swiper(`#${sectionId} .swiper`, swiperParms);
		});
	};

	document.addEventListener("shopify:section:load", function () {
		mainBlogSlider();
	});

	mainBlogSlider();
})();
