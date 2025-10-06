(function () {
	function swiperInit() {
		subSliderInit(true);
		sliderInit(true);
	}

	document.addEventListener('shopify:section:load', function (e) {
		swiperInit();
	});

	window.addEventListener('resize', function () {
		$('.product-section .js-media-list').each(function () {
			this.swiper.destroy();
		});
		$('.product-section .js-media-sublist').each(function () {
			this.swiper.destroy();
		});

		swiperInit();
	});

	swiperInit();
})();
