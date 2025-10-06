if (!customElements.get("quick-add-modal")) {
	customElements.define(
		"quick-add-modal",
		class QuickAddModal extends ModalDialog {
			constructor() {
				super();
				this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
			}

			hide(preventFocus = false) {
				const cartDrawer = document.querySelector("cart-drawer");
				if (cartDrawer) cartDrawer.setActiveElement(this.openedBy);
				this.modalContent.innerHTML = "";

				if (preventFocus) this.openedBy = null;
				super.hide();
			}

			show(opener) {
				opener.setAttribute("aria-disabled", true);
				opener.classList.add("loading");

				if (opener.querySelector(".loading-overlay__spinner")) {
					opener
						.querySelector(".loading-overlay__spinner")
						.classList.remove("hidden");
				}

				fetch(opener.getAttribute("data-product-url"))
					.then((response) => response.text())
					.then((responseText) => {
						const responseHTML = new DOMParser().parseFromString(
							responseText,
							"text/html"
						);
						this.productElement = responseHTML.querySelector(
							'div[id^="MainProduct-"]'
						);
						this.preventDuplicatedIDs();
						this.removeDOMElements();
						this.setInnerHTML(
							this.modalContent,
							this.productElement.innerHTML,
							opener
						);

						if (window.Shopify && Shopify.PaymentButton) {
							Shopify.PaymentButton.init();
						}

						if (window.ProductModel) window.ProductModel.loadShopifyXR();

						this.removeGalleryListSemantic();
						this.updateImageSizes();
						this.preventVariantURLSwitching();
						super.show(opener);
					})
					.finally(() => {
						opener.removeAttribute("aria-disabled");
						opener.classList.remove("loading");

						if (opener.querySelector(".loading-overlay__spinner")) {
							opener
								.querySelector(".loading-overlay__spinner")
								.classList.add("hidden");
						}

						var slider = new Swiper(".quick-add-modal .quick-js-media-list", {
							slidesPerView: 1,
							autoHeight: true,
							navigation: {
								nextEl: ".swiper-btn--next",
								prevEl: ".swiper-btn--prev",
							},
							pagination: {
								el: `.quick-add-modal .swiper-pagination`,
								type: "fraction",
								formatFractionCurrent: (number) => `0${number}`.slice(-2),
								formatFractionTotal: (number) => `0${number}`.slice(-2),
							},
							on: {
								slideChange: function () {
									window.pauseAllMedia();
								},
							},
						});

						//slider()

						const selectDropDown = () => {
							$(".product-form__controls--dropdown").each(function () {
								const elListItem = $(this).find(".dropdown-select ul li");
								const elItem = $(this).find(".dropdown-select ul");
								const selectedText = $(this).find(
									".dropdown-select .select-label"
								);

								selectedText.on("click", function (e) {
									elItem.toggleClass("active");
									if (elItem.hasClass("active")) {
										e.stopPropagation();
										$(document).click(function () {
											elItem.removeClass("active");
										});
									}
								});

								elListItem.on("click", function () {
									selectedText
										.find("span")
										.text($(this).text())
										.attr("title", $(this).text());
									elItem.removeClass("active");
									document.activeElement.blur();
								});
							});
						};

						selectDropDown();
					});
			}

			setInnerHTML(element, html, opener) {
				element.innerHTML = html;

				// Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
				element.querySelectorAll("script").forEach((oldScriptTag) => {
					const newScriptTag = document.createElement("script");
					Array.from(oldScriptTag.attributes).forEach((attribute) => {
						newScriptTag.setAttribute(attribute.name, attribute.value);
					});
					newScriptTag.appendChild(
						document.createTextNode(oldScriptTag.innerHTML)
					);
					oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
				});

				// Read more button
				const moreBtn = document.createElement("a");
				moreBtn.innerHTML = `<span class="button-label">${theme.quickviewMore}</span>`;
				moreBtn.setAttribute("href", opener.getAttribute("data-product-url"));
				moreBtn.setAttribute(
					"class",
					"product__read-more button button--simple"
				);
				element.querySelector(".product__info-container").appendChild(moreBtn);
			}

			removeDOMElements() {
				const pickupAvailability = this.productElement.querySelector(
					"pickup-availability"
				);
				if (pickupAvailability) pickupAvailability.remove();

				const productModal = this.productElement.querySelector("product-modal");
				if (productModal) productModal.remove();

				const popup = this.productElement.querySelectorAll(".product-popup");
				if (popup)
					popup.forEach((el) => {
						el.remove();
					});

				const reviews = this.productElement.querySelector(
					'[data-block-handle="reviews"]'
				);
				if (reviews) reviews.remove();

				const about = this.productElement.querySelectorAll(".product-about");
				if (about)
					about.forEach((el) => {
						el.remove();
					});

				const description = this.productElement.querySelector(
					".product__description"
				);
				if (description) description.remove();
				const recommendations = this.productElement.querySelector(
					".product-recommendations--single"
				);
				if (recommendations) recommendations.remove();

				const gift = this.productElement.querySelector(".customer");
				if (gift) gift.remove();
				const leftWrapper = this.productElement.querySelector(
					".product__left-wrapper"
				);
				if (leftWrapper) leftWrapper.remove();

				const subSlider = this.productElement.querySelector(
					".product__media-sublist"
				);
				if (subSlider) subSlider.remove();

				const inventory = this.productElement.querySelector(
					".product__inventory"
				);
				if (inventory) inventory.remove();

				const productText = this.productElement.querySelector(".product__text");
				if (productText) productText.remove();

				const sizeGuide = this.productElement.querySelector(".adv-btn-opener");
				if (sizeGuide) sizeGuide.remove();

				const mediaScroll = this.productElement.querySelector(".product__media-scroll-wrapper");
				if (mediaScroll) mediaScroll.remove();
				const mediaSlider = this.productElement.querySelector(".product__media-list-wrapper");
				if (mediaSlider) mediaSlider.remove();
				const mediaGrid = this.productElement.querySelector(".product__media-list__container--large-default");
				if (mediaGrid) mediaGrid.remove();

				const mediaQuick = this.productElement.querySelector(".quick-product__media-list");
				mediaQuick.style.display = 'block';
			}

			preventDuplicatedIDs() {
				const sectionId = this.productElement.dataset.section;
				this.productElement.innerHTML =
					this.productElement.innerHTML.replaceAll(
						sectionId,
						`quickadd-${sectionId}`
					);
				this.productElement
					.querySelectorAll("variant-selects, variant-radios")
					.forEach((variantSelect) => {
						variantSelect.dataset.originalSection = sectionId;
					});
			}

			preventVariantURLSwitching() {
				if (this.modalContent.querySelector("variant-radios,variant-selects")) {
					this.modalContent
						.querySelector("variant-radios,variant-selects")
						.setAttribute("data-update-url", "false");
				}
			}

			removeGalleryListSemantic() {
				const galleryList = this.modalContent.querySelector(
					'[id^="Slider-Gallery"]'
				);
				if (!galleryList) return;

				galleryList.setAttribute("role", "presentation");
				galleryList
					.querySelectorAll('[id^="Slide-"]')
					.forEach((li) => li.setAttribute("role", "presentation"));
			}

			updateImageSizes() {
				const product = this.modalContent.querySelector(".product");
				const desktopColumns = product.classList.contains("product--columns");
				if (!desktopColumns) return;

				const mediaImages = product.querySelectorAll(".product__media img");
				if (!mediaImages.length) return;

				let mediaImageSizes =
					"(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)";

				if (product.classList.contains("product--medium")) {
					mediaImageSizes = mediaImageSizes.replace("715px", "605px");
				} else if (product.classList.contains("product--small")) {
					mediaImageSizes = mediaImageSizes.replace("715px", "495px");
				}

				mediaImages.forEach((img) =>
					img.setAttribute("sizes", mediaImageSizes)
				);
			}
		}
	);
}
