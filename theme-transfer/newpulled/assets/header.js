(function () {
	const header = () => {
		const body = document.querySelector("body");
		const header = document.querySelector(".shopify-section-header");
		const headerDetails = document.querySelector(".menu-drawer-container");
		const headerIsAlwaysSticky =
			header
				.querySelector(".header-wrapper")
				.getAttribute("data-sticky-type") === "always";

		headerDetails.addEventListener("toggle", function (e) {
			const colorScheme =
				this.querySelector("#menu-drawer").dataset.colorScheme;
			header.classList.toggle(colorScheme);
		});

		document.addEventListener("keyup", (e) => {
			if (e.key === "Escape") {
				header.classList.remove("shopify-section-header-sticky", "animate");
				body.classList.remove("overflow-hidden");
			}
		});

		document.addEventListener("scroll", () => {
			let scrollTop = window.scrollY;
			if (scrollTop > header.offsetHeight && headerIsAlwaysSticky) {
				header.classList.add("fixed", "animate");
			} else if (scrollTop <= header.offsetHeight && headerIsAlwaysSticky) {
				header.classList.remove("fixed", "animate");
			}
		});

		//$(".mega-menu-details summary").click(function (e) {
		//	e.preventDefault();
		//	const attrOpen = $(this).attr("open");
		//	if (attrOpen === false || attrOpen === undefined) {
		//		console.log(attrOpen);
		//		//$(".mega-menu-details").removeAttr("open");
		//		//$(this).attr("open", "open");
		//	} else {
		//		$(".mega-menu-details").removeAttr("open");
		//	}
		//});

		$(".header__icon--account").click(function (e) {
			$(".search-modal").removeClass("active");
		});

		const announcementBar = document.querySelector(".announcement-bar");
		const headerOffcanvas = document.querySelector(".burger-drawer");
		const headerOverlayWithBackground = document.querySelector('[data-overlay-with-background]')?.dataset.overlayWithBackground === 'true';

		announcementBar &&
			headerOffcanvas &&
			headerOffcanvas.classList.add("announcement-bar-show");

		$(window).scroll(function () {
			if ($(window).scrollTop() > 100) {
				announcementBar &&
					headerOffcanvas &&
					headerOffcanvas.classList.add("announcement-bar-hide");
				announcementBar &&
					headerOffcanvas &&
					headerOffcanvas.classList.remove("announcement-bar-show");
			} else {
				announcementBar &&
					headerOffcanvas &&
					headerOffcanvas.classList.remove("announcement-bar-hide");
				announcementBar &&
					headerOffcanvas &&
					headerOffcanvas.classList.add("announcement-bar-show");
			}
		});
		$(".shopify-section-header").hover(
			function () {
				if (
					!$(".burger-drawer").hasClass("active") ||
					!$("#search-modal").hasClass("active")
				) {
					if (!headerOverlayWithBackground) {
						$(".shopify-section-header").addClass("color-background-1");
					}
					
				}
			},
			function () {
				if (
					$(".burger-drawer").hasClass("active") ||
					$("#search-modal").hasClass("active")
				) {
					if (!headerOverlayWithBackground) {
						$(".shopify-section-header").addClass("color-background-1");
					}
					
				} else {
					$(".shopify-section-header").removeClass("color-background-1");
				}
			}
		);
	};
	document.addEventListener("shopify:section:load", header);
	header();
})();
