function setupMediaHover(section) {
	const products = section.querySelectorAll('.pwi_product-item');
	const mediaItems = section.querySelectorAll('.pwi_image-item');
	const defaultMedia = section.querySelector('.pwi_image-default');
	
	products.forEach(function(product) {
			product.addEventListener('mouseover', function() {
					const index = product.getAttribute('data-index');
					
					mediaItems.forEach(function(media) {
							media.classList.remove('show');
					});
					
					const mediaToShow = section.querySelector('#media-item-' + index);
					if (mediaToShow) {
							mediaToShow.classList.add('show');
					}
			});
			
			product.addEventListener('mouseout', function() {
					mediaItems.forEach(function(media) {
							media.classList.remove('show');
					});
					
					if (defaultMedia) {
							defaultMedia.classList.add('show');
					}
			});
	});
}

function initializeSections() {
	const sections = document.querySelectorAll('.products-with-image');
	sections.forEach(function(section) {
			setupMediaHover(section);
	});
}

document.addEventListener("DOMContentLoaded", function () {
	initializeSections();
	
	document.addEventListener("shopify:section:load", function (event) {
			const newSections = event.target.querySelectorAll('.products-with-image');
			newSections.forEach(function(newSection) {
					setupMediaHover(newSection);
			});
	});
});
