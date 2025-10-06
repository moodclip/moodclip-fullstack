(function () {
	const slideshow = () => {
		$(".slideshow-section").each(function () {
			if ($(this).hasClass("slider_started")) {
				return;
			}
			$(this).addClass("slider_started");

			const id = $(this).attr("id");
			const box = $(this).find(".slideshow");
			const autoplay = box.data("autoplay");
			const delay = box.data("delay") * 1000;
			const directionSlider = true;
			const bulletsContainer = $(this).find("#bullets-show")[0];

			let startX = 0;
			let endX = 0;
			class Slider {
				#current = 0;
				constructor(
					element,
					reverseDirection = false,
					bulletsContainer = null
				) {
					this.element = element;
					this.reverseDirection = reverseDirection;
					this.bulletsContainer = bulletsContainer;
					this.items = [
						...this.element.querySelectorAll(".slideshow__slider__item"),
					];
					this.itemsInner = this.items.map((item) =>
						item.querySelector(".slideshow__slider__item-inner")
					);
					//this.items[this.current].classList.add("slider__item--current");

					this.items.forEach((item, index) => {
						if (index === this.current) {
							item.classList.add("slider__item--current");
							gsap.set(item, { opacity: 1 });
						} else {
							gsap.set(item, { opacity: 0 });
						}
					});

					this.itemsTotal = this.items.length;
					gsap.set([this.items, this.itemsInner], {
						"will-change": "transform",
					});
					if (element.classList.contains("slideshow__slider--bg")) {
						this.initBullets();
					}

					this.element.addEventListener("touchstart", (event) => {
						if (event.target.closest(".slideshow-slide__text")) {
							return;
					}
						startX = event.touches[0].clientX;
						
					});

					this.element.addEventListener("touchmove", (event) => {
						if (event.target.closest(".slideshow-slide__text")) {
							return;
					}
						endX = event.touches[0].clientX;
					});

					this.element.addEventListener("touchend", () => {
						if (document.elementFromPoint(startX, 0).closest(".slideshow-slide__text")) {
							return;
					}
						this.handleSwipe();
						
					});
				}

				handleSwipe() {
					
					if (startX - endX > 50) {
						this.next();
					} else if (endX - startX > 50) {
						this.prev();
					}
					startX = 0;
					endX = 0;
				}

				initBullets() {
					if (this.bulletsContainer) {
						this.bullets = this.items.map((_, i) => {
							const bullet = document.createElement("li");
							if (autoplay) {
								bullet.classList.add("animate");
							}
							const bulletInner = document.createElement("span");
							bullet.dataset.index = i;
							this.bulletsContainer.appendChild(bullet);
							bullet.appendChild(bulletInner);
							bullet.addEventListener("click", () => this.goTo(i));
							return bullet;
						});
						this.updateBullets();
					}
				}
				updateBullets() {
					if (this.bulletsContainer) {
						this.bullets.forEach((bullet, i) => {
							bullet.classList.toggle("active", i === this.current);
						});
					}
				}
				next() {
					if (this.items.length <= 1) return false;
					this.navigate(1);
				}
				prev() {
					if (this.items.length <= 1) return false;
					this.navigate(-1);
				}
				goTo(index) {
					if (
						this.items.length <= 1 ||
						this.isAnimating ||
						index === this.current
					)
						return false;

					const direction = index > this.current ? 1 : -1;
					this.navigate(direction, index);
				}

				get current() {
					return this.#current;
				}
				set current(value) {
					this.#current = value;
					if (this.element.classList.contains("slideshow__slider--bg")) {
						this.updateBullets();
					}
				}
				navigate(direction, targetIndex = null) {
					if (this.isAnimating || this.items.length <= 1) return false;
					this.isAnimating = true;

					const previous = this.current;

					if (targetIndex !== null) {
						this.current = targetIndex;
					} else {
						this.current =
							direction === 1
								? this.current < this.itemsTotal - 1
									? ++this.current
									: 0
								: this.current > 0
								? --this.current
								: this.itemsTotal - 1;
					}

					const currentItem = this.items[previous];
					const currentInner = this.itemsInner[previous];
					const upcomingItem = this.items[this.current];
					const upcomingInner = this.itemsInner[this.current];

					if (directionSlider) {
						gsap
							.timeline({
								defaults: { duration: 1.1, ease: "power3.inOut" },
								onComplete: () => {
									this.items[previous].classList.remove(
										"slider__item--current"
									);
									this.items[this.current].classList.add(
										"slider__item--current"
									);
									this.isAnimating = false;
								},
							})
							.to(currentItem, {
								xPercent: this.reverseDirection
									? direction * 100
									: -direction * 100,
								onComplete: () => gsap.set(currentItem, { opacity: 0 }),
							})
							.to(
								currentInner,
								{
									xPercent: this.reverseDirection
										? -direction * 30
										: direction * 30,
									rotation: -direction * 1,
									scaleX: 2.8,
								},
								0
							)
							.to(
								upcomingItem,
								{
									startAt: {
										opacity: 1,
										xPercent: this.reverseDirection
											? -direction * 80
											: direction * 80,
									},
									xPercent: 0,
								},
								0
							)
							.to(
								upcomingInner,
								{
									startAt: {
										xPercent: this.reverseDirection
											? direction * 30
											: -direction * 30,
										scaleX: 2.8,
										rotation: direction * 1,
									},
									xPercent: 0,
									scaleX: 1,
									rotation: 0,
								},
								0
							);
					} else {
						gsap
							.timeline({
								defaults: { duration: 1.1, ease: "power3.inOut" },
								onComplete: () => {
									this.items[previous].classList.remove(
										"slider__item--current"
									);
									this.items[this.current].classList.add(
										"slider__item--current"
									);

									this.isAnimating = false;
								},
							})
							.to(currentItem, {
								yPercent: this.reverseDirection
									? direction * 100
									: -direction * 100,
								onComplete: () => gsap.set(currentItem, { opacity: 0 }),
							})
							.to(
								currentInner,
								{
									yPercent: this.reverseDirection
										? -direction * 30
										: direction * 30,
									startAt: {
										rotation: 0,
									},
									rotation: -direction * 1,
									scaleY: 2.8,
								},
								0
							)
							.to(
								upcomingItem,
								{
									startAt: {
										opacity: 1,
										yPercent: this.reverseDirection
											? -direction * 80
											: direction * 80,
									},
									yPercent: 0,
								},
								0
							)
							.to(
								upcomingInner,
								{
									startAt: {
										yPercent: this.reverseDirection
											? direction * 30
											: -direction * 30,
										scaleY: 2.8,
										rotation: direction * 1,
									},
									yPercent: 0,
									scaleY: 1,
									rotation: 0,
								},
								0
							);
					}
				}
			}

			const navigation = {
				next: this.querySelector(
					".slideshow-slider__buttons > .slideshow-button-next"
				),
				prev: this.querySelector(
					".slideshow-slider__buttons > .slideshow-button-prev"
				),
			};

			const sliderBG = new Slider(
				this.querySelector(".slideshow__slider--bg"),
				false,
				bulletsContainer
			);

			const navigate = (action) => {
				sliderBG[action]();
			};

			navigation.next.addEventListener("click", () => navigate("next"));
			navigation.prev.addEventListener("click", () => navigate("prev"));

			if (autoplay) {
				let st = setInterval(() => {
					$(navigation.next).trigger("click");
				}, delay);
				$(this).on({
					mouseenter: () => {
						st = clearInterval(st);
					},
					mouseleave: () => {
						st = setInterval(() => {
							$(navigation.next).trigger("click");
						}, delay);
					},
				});
			}

			const cursorProgress = (slideshowSwiper) => {
				const cursor = this.querySelector(".slideshow__cursor");

				const animateCursor = (e) => {
					const contentRect = slideshowSwiper.getBoundingClientRect();
					const x = e.clientX - contentRect.left - 21;
					const y = e.clientY - contentRect.top - 21;

					//cursor.style.left = `${x}px`;
					//cursor.style.top = `${y}px`;

					//const x = e.clientX - cursor.offsetWidth / 2 - 21,
					//	y = e.clientY - cursor.offsetHeight / 2 - 21;

					const keyframes = {
						transform: `translate(${x}px, ${y}px) `,
					};

					cursor.animate(keyframes, {
						duration: 300,
						fill: "forwards",
					});
				};
			
				const mediaQuery = window.matchMedia("(max-width: 1200px)");

				if (mediaQuery.matches) {
						num = 40; 
				} else {
						num = 80; 
				}
	
				const getCursorClass = (position, width) => {
					if (position - num < width / 2) {
						return "prev";
					} else {
						return "next";
					}
				};
		

	
				slideshowSwiper.addEventListener("mousemove", (e) => {
					const cursorIcon = document.getElementById("cursor-icon1");
					const cursorEl = document.querySelector(`#${id} .slideshow__cursor`);
					const swiperWidth = slideshowSwiper.clientWidth;

					if (
						!e.target.closest(".slideshow-slide__text") &&
						!e.target.closest(".bullets")
					) {
						cursorEl.classList.add("active");
					} else {
						cursorEl.classList.remove("active");
					}

					animateCursor(e);

					cursor.dataset.type = getCursorClass(e.clientX, swiperWidth);
					cursorIcon.className = cursor.dataset.type;
				});
				slideshowSwiper.addEventListener("mouseleave", (e) => {
					const cursorEl = document.querySelector(`#${id} .slideshow__cursor`);
					cursorEl.classList.remove("active");
				});

				slideshowSwiper.addEventListener("click", (e) => {
					const swiperWidth = slideshowSwiper.clientWidth;
					const clickedPosition =
						e.clientX - slideshowSwiper.getBoundingClientRect().left;

						if (e.target.closest(".slideshow-slide__text")) {
							return;
						}
					
					if (clickedPosition < swiperWidth / 2) {
						navigation.prev.click();
					} else {
						navigation.next.click();
					}
				});
			};

			cursorProgress(this.querySelector(".slideshow__swiper"));
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		slideshow();

		document.addEventListener("shopify:section:load", function () {
			slideshow();
		});
	});
})();
