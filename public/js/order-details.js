document.addEventListener('DOMContentLoaded', function() {
    // Set up expand/collapse functionality for order cards
    const orderCards = document.querySelectorAll('.order-card');
    orderCards.forEach(card => {
        const header = card.querySelector('.order-header');
        const expandIcon = card.querySelector('.expand-icon');
        
        header.addEventListener('click', () => {
            
            card.classList.toggle('expanded');
            
            // Update the expand/collapse icon
            if (card.classList.contains('expanded')) {
                expandIcon.classList.remove('fa-chevron-down');
                expandIcon.classList.add('fa-chevron-up');
            } else {
                expandIcon.classList.remove('fa-chevron-up');
                expandIcon.classList.add('fa-chevron-down');
            }
        });
    });
    
    // Cancel Item Modal
    function cancelItem(itemId) {
        document.getElementById('cancelItemId').value = itemId;
        const modal = new bootstrap.Modal(document.getElementById('cancelItemModal'));
        modal.show();
    }
    
    // Return Item Modal
    function returnItem(itemId) {
        document.getElementById('returnItemId').value = itemId;
        const modal = new bootstrap.Modal(document.getElementById('returnItemModal'));
        modal.show();
    }
    
    // Cancel Order Modal
    function cancelOrder(orderId) {
        document.getElementById('cancelOrderId').value = orderId;
        const modal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
        modal.show();
    }
    
    // Handle cancel item confirmation
    document.getElementById('confirmCancelItem').addEventListener('click', function() {
        const itemId = document.getElementById('cancelItemId').value;
        const reason = document.getElementById('cancelReason').value;
        const comment = document.getElementById('cancelComment').value;
        
        if (!reason) {
            alert('Please select a reason for cancellation');
            return;
        }
        
        
        fetch('/profile/order/cancel-item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemId: itemId,
                reason: reason,
                comment: comment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Failed to cancel item');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('cancelItemModal'));
        modal.hide();
    });
    
    // Handle return item confirmation
    document.getElementById('confirmReturnItem').addEventListener('click', function() {
        const itemId = document.getElementById('returnItemId').value;
        const reason = document.getElementById('returnReason').value;
        const condition = document.getElementById('returnCondition').value;
        const comment = document.getElementById('returnComment').value;
        
        if (!reason || !condition) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Send return request to server
        fetch('/api/order/return-item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemId: itemId,
                reason: reason,
                condition: condition,
                comment: comment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Failed to submit return request');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('returnItemModal'));
        modal.hide();
    });
    
    // Handle cancel order confirmation
    document.getElementById('confirmCancelOrder').addEventListener('click', function() {
        const orderId = document.getElementById('cancelOrderId').value;
        const reason = document.getElementById('orderCancelReason').value;
        const comment = document.getElementById('orderCancelComment').value;
        
        if (!reason) {
            alert('Please select a reason for cancellation');
            return;
        }
        
        // Send cancel order request to server
        fetch('/profile/order/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: orderId,
                reason: reason,
                comment: comment
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Failed to cancel order');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal'));
        modal.hide();
    });
    
    // Print order details
    window.printOrder = function() {
        window.print();
    };
    
    // Expose the functions to global scope
    window.cancelItem = cancelItem;
    window.returnItem = returnItem;
    window.cancelOrder = cancelOrder;
});