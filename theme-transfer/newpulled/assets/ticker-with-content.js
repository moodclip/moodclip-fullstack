(function () {
  const tickSlider = () => {
		$(".ticker-with-content").each(function(){
			if ($(this).hasClass('slider_started')){
				return ''
			}
			$(this).addClass('slider_started');
			const tickerId = $(this).data('ticker-id');
			const tickerSpeed = $(this).data('ticker-speed') * 1000;
			const tickerSpaceBetween = $(this).data('ticker-space-between');
			const tickerSwiper = new Swiper(`.ticker-js-${tickerId}`, {
				slidesPerView: "auto",
				speed: tickerSpeed,
				initialSlide: 0,
				spaceBetween: tickerSpaceBetween,
				loop: true,
				loopedSlides: 50,
				allowTouchMove: false,
				waitForTransition: false,
				watchSlidesProgress: false,
				autoplay: {
					delay: 0,
					disableOnInteraction: false,
				},
			});
		})
  };

  tickSlider();
  document.addEventListener("shopify:section:load", function () {
    setTimeout(() => {
      tickSlider();
    }, 100);
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      $(".ticker-js").each(function () {
        this.swiper.destroy();
      });
      tickSlider();
    }
  });

  setTimeout(() => {
    tickSlider();
  }, 100);
})();
