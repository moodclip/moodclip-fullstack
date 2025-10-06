(function () {
	document.addEventListener('shopify:section:load', function () {
		const slider = new Swiper('.js-media-list', getSliderSettings);

		const subSlider = new Swiper('.js-media-sublist', getSubSliderProductSettings);

		setTimeout(function () {
			slider.update();
			subSlider.update();
		}, 100)
	});
})();
