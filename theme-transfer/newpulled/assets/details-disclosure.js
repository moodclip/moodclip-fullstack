class DetailsDisclosure extends HTMLElement {
	constructor() {
		super();
		this.mainDetailsToggle = this.querySelector("details");

		this.addEventListener("keyup", this.onKeyUp);
		document.addEventListener("click", this.onFocusOut.bind(this));
	}

	onKeyUp(event) {
		if (event.code.toUpperCase() !== "ESCAPE") return;

		const openDetailsElement = event.target.closest("details[open]");
		if (!openDetailsElement) return;

		const summaryElement = openDetailsElement.querySelector("summary");
		openDetailsElement.removeAttribute("open");
		summaryElement.focus();
	}

	onFocusOut(e) {
		const withBoundaries = e.composedPath().includes(this.mainDetailsToggle);

		if (!withBoundaries) {
			this.mainDetailsToggle.removeAttribute("open");
		}
	}

	close() {
		this.mainDetailsToggle.removeAttribute("open");
	}
}

customElements.define("details-disclosure", DetailsDisclosure);
class DetailsDisclosureFilter extends HTMLElement {
	constructor() {
		super();
		this.mainDetailsToggle = this.querySelector("details");
		this.content = this.mainDetailsToggle.querySelector(
			".facets__wrapper .close_filter_element"
		);

		this.addEventListener("keyup", this.onKeyUp);
		this.content.addEventListener("focusout", this.onFocusOut.bind(this));
	}

	onKeyUp(event) {
		if (event.code.toUpperCase() !== "ESCAPE") return;

		const openDetailsElement = event.target.closest("details[open]");
		if (!openDetailsElement) return;

		const summaryElement = openDetailsElement.querySelector("summary");
		openDetailsElement.removeAttribute("open");
		summaryElement.focus();
		document.querySelector(".facets__wrapper").classList.remove("active");

		document.querySelector(".facets-mask").classList.remove("active");
		document.querySelector(".facets__button-show").classList.remove("active");
	}

	onFocusOut() {
		setTimeout(() => {
			this.close();
		});
	}

	close() {
		this.mainDetailsToggle.removeAttribute("open");
		this.mainDetailsToggle
			.querySelector("summary")
			.setAttribute("aria-expanded", false);
	}
}

customElements.define("details-disclosure-filter", DetailsDisclosureFilter);
