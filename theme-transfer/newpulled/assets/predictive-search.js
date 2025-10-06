class PredictiveSearch extends SearchForm {
	constructor() {
		super();
		this.cachedResults = {};
		this.predictiveSearchResults = this.querySelector(
			"[data-predictive-search]",
		);
		this.allPredictiveSearchInstances =
			document.querySelectorAll("predictive-search");
		this.isOpen = false;
		this.abortController = new AbortController();
		this.searchTerm = "";
		this.body = document.querySelector("body");
		this.headerBottom = document.querySelector(".header__bottom");
		this.promoModal = document.querySelector(".search__modal");
		this.headerInput = document.querySelector(".search-modal .search__input");
		this.calcHeight();
		this.setupEventListeners();
		this.initEventListeners();

		const searchResizeObserver = new ResizeObserver((entries) => {
			const [entry] = entries;

			if (entry.contentRect.width < 991) {
				this.calcHeight(65);
			} else {
				this.calcHeight(0);
			}
		});

		searchResizeObserver.observe(this.body);
	}

	calcHeight(buttonHeight) {
		let heightHeader = document.querySelector(".shopify-section-header")
			? document
					.querySelector(".shopify-section-header")
					.getBoundingClientRect().height
			: 0;
		let heightSearchTop = document.querySelector(".search__form__wrapper")
			? document.querySelector(".search__form__wrapper").getBoundingClientRect()
					.height
			: 0;
		let heightInput = this.headerInput.getBoundingClientRect().height;

		if (document.querySelector(".predictive-search")) {
			let maxHeightContent = parseFloat(
				window
					.getComputedStyle(document.querySelector(".predictive-search"), null)
					.getPropertyValue("max-height"),
			);
			let heightContent = document
				.querySelector(".predictive-search")
				.getBoundingClientRect().height;

			let clientHeight = document.documentElement.clientHeight;
			let maxHeightAllowed =
				clientHeight -
				//heightHeader -
				heightSearchTop -
				heightInput -
				buttonHeight -
				10;
			document.querySelector(
				".predictive-search",
			).style.maxHeight = `${maxHeightAllowed}px`;
		}
	}

	setupEventListeners() {
		this.input.form.addEventListener("submit", this.onFormSubmit.bind(this));
		this.input.addEventListener("focus", this.onFocus.bind(this));
		this.addEventListener("focusout", this.onFocusOut.bind(this));
		this.addEventListener("keyup", this.onKeyup.bind(this));
		this.addEventListener("keydown", this.onKeydown.bind(this));
	}

	getQuery() {
		return this.input.value.trim();
	}

	onChange() {
		const newSearchTerm = this.getQuery();
		if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
			// Remove the results when they are no longer relevant for the new search term
			// so they don't show up when the dropdown opens again
			this.querySelector("#predictive-search-results-groups-wrapper")?.remove();
		}

		// Update the term asap, don't wait for the predictive search query to finish loading
		this.updateSearchForTerm(this.searchTerm, newSearchTerm);

		this.searchTerm = newSearchTerm;

		if (!this.searchTerm.length) {
			this.close(true);
			return;
		}

		this.getSearchResults(this.searchTerm);
	}

	onFormSubmit(event) {
		if (
			!this.getQuery().length ||
			this.querySelector('[aria-selected="true"] a') ||
			event.submitter.classList.contains("card__link")
		)
			event.preventDefault();
	}

	onFormReset(event) {
		super.onFormReset(event);
		if (super.shouldResetForm()) {
			this.searchTerm = "";
			this.abortController.abort();
			this.abortController = new AbortController();
			this.closeResults(true);
		}
	}

	onFocus() {
		const currentSearchTerm = this.getQuery();
		if (this.classList.contains("search-modal__form")) {
			if (this.headerBottom) {
				this.headerBottom.classList.add("header__bottom--visible");
			}
			if (this.promoModal) {
				this.promoModal.classList.remove("search__modal--hidden");
			}
		}

		if (!currentSearchTerm.length) {
			return;
		}

		if (this.searchTerm !== currentSearchTerm) {
			// Search term was changed from other search input, treat it as a user change
			this.onChange();
		} else if (this.getAttribute("results") === "true") {
			this.open();
			if (this.promoModal) {
				this.promoModal.classList.add("search__modal--hidden");
			}
		} else {
			this.getSearchResults(this.searchTerm);
		}
	}

	onFocusOut() {
		if (this.classList.contains("search-modal__form")) {
			if (this.headerBottom) {
				this.headerBottom.classList.remove("header__bottom--visible");
			}
		}
		if (!this.classList.contains("search-modal__form")) {
			setTimeout(() => {
				if (!this.contains(document.activeElement)) this.close();
			});
		}
	}

	onBlur() {
		this.headerInput.blur();
	}

	onKeyup(event) {
		if (!this.getQuery().length) this.close(true);
		event.preventDefault();

		switch (event.code) {
			case "Enter":
				event.preventDefault();
				this.selectOption();
				break;
			case "Escape":
				this.closeResults(true);
				if (this.promoModal && this.classList.contains("search-modal__form")) {
					this.promoModal.classList.add("search__modal--hidden");
				}
				break;
		}

		if (this.getQuery().length) {
			this.hidePromoBlock();
		} else {
			this.showPromoBlock();
		}
	}

	onKeydown(event) {
		// Prevent the cursor from moving in the input when using the up and down arrow keys
		if (event.code === "ArrowUp" || event.code === "ArrowDown") {
			event.preventDefault();
		}
	}

	updateSearchForTerm(previousTerm, newTerm) {
		const searchForTextElement = this.querySelector(
			"[data-predictive-search-search-for-text]",
		);
		const currentButtonText = searchForTextElement?.innerText;
		if (currentButtonText) {
			if (
				currentButtonText.matchAll(new RegExp(previousTerm, "g")).length > 1
			) {
				// The new term matches part of the button text and not just the search term, do not replace to avoid mistakes
				return;
			}
			const newButtonText = currentButtonText.replace(previousTerm, newTerm);
			searchForTextElement.innerText = newButtonText;
		}
		if (this.getQuery().length) {
			this.hidePromoBlock();
		} else {
			this.showPromoBlock();
		}
	}

	selectOption() {
		const selectedOption = this.querySelector(
			'[aria-selected="true"] a, button[aria-selected="true"]',
		);

		if (selectedOption) selectedOption.click();
	}

	getSearchResults(searchTerm) {
		const queryKey = searchTerm.replace(" ", "-").toLowerCase();
		this.setLiveRegionLoadingState();

		if (this.cachedResults[queryKey]) {
			this.renderSearchResults(this.cachedResults[queryKey]);
			this.clickSearchTabs();
			this.calcHeight();
			return;
		}

		if (this.promoModal && this.classList.contains("search-modal__form")) {
			this.promoModal.classList.add("search__modal--hidden");
		}

		fetch(
			`${routes.predictive_search_url}?q=${encodeURIComponent(
				searchTerm
			)}&section_id=predictive-search`,
			{ signal: this.abortController.signal }
		)
			.then((response) => {
				if (!response.ok) {
					var error = new Error(response.status);
					this.close();
					throw error;
				}
				return response.text();
			})
			.then((text) => {
				const resultsMarkup = new DOMParser()
					.parseFromString(text, "text/html")
					.querySelector("#shopify-section-predictive-search").innerHTML;
				// Save bandwidth keeping the cache in all instances synced
				this.allPredictiveSearchInstances.forEach(
					(predictiveSearchInstance) => {
						predictiveSearchInstance.cachedResults[queryKey] = resultsMarkup;
					},
				);
				this.renderSearchResults(resultsMarkup);
				this.clickSearchTabs();
				this.calcHeight();
				colorSwatches();
			})
			.catch((error) => {
				if (error?.code === 20) {
					// Code 20 means the call was aborted
					return;
				}
				this.close();
				throw error;
			});
	}

	setLiveRegionLoadingState() {
		this.statusElement =
			this.statusElement || this.querySelector(".predictive-search-status");
		this.loadingText =
			this.loadingText || this.getAttribute("data-loading-text");

		this.setLiveRegionText(this.loadingText);
		this.setAttribute("loading", true);
	}

	setLiveRegionText(statusText) {
		this.statusElement.setAttribute("aria-hidden", "false");
		this.statusElement.textContent = statusText;

		setTimeout(() => {
			this.statusElement.setAttribute("aria-hidden", "true");
		}, 1000);
	}

	renderSearchResults(resultsMarkup) {
		this.predictiveSearchResults.innerHTML = resultsMarkup;
		this.setAttribute("results", true);

		this.setLiveRegionResults();
		this.open();
		if (this.promoModal && this.classList.contains("search-modal__form")) {
			this.promoModal.classList.add("search__modal--hidden");
		}
	}

	clickSearchTabs() {
		const results = this.querySelectorAll(".predictive-search__results-list");
		if (results.length != 0) {
			results[0].classList.add("active");
			this.querySelector(".predictive-search__result-tab").classList.add(
				"active",
			);
			this.querySelectorAll(".predictive-search__result-tab").forEach((tab) => {
				tab.addEventListener("click", (event) => {
					event.preventDefault();
					const typeTarget = tab.dataset.typeTarget;
					this.querySelectorAll(".predictive-search__result-tab").forEach(
						(element) => {
							element.classList.remove("active");
						},
					);
					tab.classList.add("active");

					results.forEach((element) => {
						let resultsType = element.dataset.type;
						if (resultsType == typeTarget) {
							element.classList.add("active");
						} else {
							element.classList.remove("active");
						}
					});
				});
			});
		}
	}

	hidePromoBlock() {
		document.querySelector(".search__recomendation")
			? document.querySelector(".search__recomendation").classList.add("hidden")
			: false;
	}

	showPromoBlock() {
		document.querySelector(".search__recomendation")
			? document.querySelector(".search__recomendation").classList.remove("hidden")
			: false;
	}

	setLiveRegionResults() {
		this.removeAttribute("loading");
		this.setLiveRegionText(
			this.querySelector("[data-predictive-search-live-region-count-value]")
				.textContent,
		);
	}
	initEventListeners() {
		document.querySelector('.search-modal .reset-search').addEventListener('click', (event) => {
				event.preventDefault(); // предотвратить стандартное поведение кнопки, если это необходимо
				this.close(true);
				this.updateSearchForTerm(this.input.value, "");
		});
	}

	open() {
		this.setAttribute("open", true);
		this.input.setAttribute("aria-expanded", true);
		this.isOpen = true;
		this.parentElement.parentElement.parentElement.classList.add('predictive-open');
		if (this.promoModal && this.classList.contains("search-modal__form")) {
			this.promoModal.classList.remove("search__modal--hidden");
		}
	}

	close(clearSearchTerm = false) {
		this.closeResults(clearSearchTerm);
		this.parentElement.parentElement.parentElement.classList.remove('predictive-open');
		this.isOpen = false;
	}

	closeResults(clearSearchTerm = false) {
		if (clearSearchTerm) {
			this.input.value = "";
			this.removeAttribute("results");
		}
		const selected = this.querySelector('[aria-selected="true"]');

		if (selected) selected.setAttribute("aria-selected", false);

		this.input.setAttribute("aria-activedescendant", "");
		this.removeAttribute("loading");
		this.removeAttribute("open");
		this.input.setAttribute("aria-expanded", false);
		this.predictiveSearchResults.removeAttribute("style");
		if (this.promoModal) {
			this.promoModal.classList.add("search__modal--hidden");
		}
	}


}

customElements.define("predictive-search", PredictiveSearch);