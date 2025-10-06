//(function () {
//	const calcMinHeight = () => {
//		if (window.outerWidth < 767) {
//			return "";
//		}
//		const facetsTop = document.querySelector(".facets__horizontal-top");
//		const collectionWrapper = document.querySelector(".collection-wrapper");
//		const height = facetsTop.offsetHeight + 40;
//		collectionWrapper.style.paddingTop = `${height}px`;
//	};

//	const resizeCollectionGrid = () => {
//		if (window.outerWidth < 767) {
//			return "";
//		}
//		const collectionGridSection = document.querySelector(
//			".facets__horizontal-top"
//		);
//		const sectionResizeObserver = new ResizeObserver((entries) => {
//			const [entry] = entries;
//			calcMinHeight();
//		});

//		sectionResizeObserver.observe(collectionGridSection);
//	};

//	document.addEventListener("shopify:section:load", function () {
//		resizeCollectionGrid();
//	});
//	calcMinHeight();
//	resizeCollectionGrid();
//})();
