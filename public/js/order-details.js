
    function cancelItem(itemId) {
        document.getElementById('cancelItemId').value = itemId;
        const modal = new bootstrap.Modal(document.getElementById('cancelItemModal'));
        modal.show();
    }

    function returnItem(itemId) {
        document.getElementById('returnItemId').value = itemId;
        const modal = new bootstrap.Modal(document.getElementById('returnItemModal'));
        modal.show();
    }

    function cancelOrder(orderId) {
        document.getElementById('cancelOrderId').value = orderId;
        const modal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
        modal.show();
    }
    
    function returnOrder(orderId) {
        document.getElementById('returnOrderId').value = orderId;
        const modal = new bootstrap.Modal(document.getElementById('returnOrderModal'));
        modal.show();
    }

document.addEventListener('DOMContentLoaded', function () {
    const orderCards = document.querySelectorAll('.order-card');
    orderCards.forEach(card => {
        const header = card.querySelector('.order-header');
        const expandIcon = card.querySelector('.expand-icon');

        header.addEventListener('click', () => {

            card.classList.toggle('expanded');

            if (card.classList.contains('expanded')) {
                expandIcon.classList.remove('fa-chevron-down');
                expandIcon.classList.add('fa-chevron-up');
            } else {
                expandIcon.classList.remove('fa-chevron-up');
                expandIcon.classList.add('fa-chevron-down');
            }
        });
    });

    document.getElementById('confirmCancelItem').addEventListener('click', function () {
        const itemId = document.getElementById('cancelItemId').value;
        const reason = document.getElementById('cancelReason').value;
        const comment = document.getElementById('cancelComment').value;

        if (!reason) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Reason',
                text: 'Please select a reason for cancellation'
            });
            return;
        }

        fetch('/profile/order/cancel-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, reason, comment })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Cencellation Requested',
                        text: 'The item was cancelled successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to cancel item'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred. Please try again later.'
                });
            });

        const modal = bootstrap.Modal.getInstance(document.getElementById('cancelItemModal'));
        modal.hide();
    });

    document.getElementById('confirmReturnItem').addEventListener('click', function () {
        const itemId = document.getElementById('returnItemId').value;
        const reason = document.getElementById('returnReason').value;
        const comment = document.getElementById('returnComment').value;

        if (!reason) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in all required fields'
            });
            return;
        }

        fetch('/profile/order/return-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, reason, comment })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Return Requested',
                        text: 'Your return request was submitted.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to submit return request'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred. Please try again later.'
                });
            });

        const modal = bootstrap.Modal.getInstance(document.getElementById('returnItemModal'));
        modal.hide();
    });

    document.getElementById('confirmCancelOrder').addEventListener('click', function () {
        const orderId = document.getElementById('cancelOrderId').value;
        const reason = document.getElementById('orderCancelReason').value;
        const comment = document.getElementById('orderCancelComment').value;

        if (!reason) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Reason',
                text: 'Please select a reason for cancellation'
            });
            return;
        }

        fetch('/profile/order/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, reason, comment })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Order Cancelled',
                        text: 'The order was cancelled successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to cancel order'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred. Please try again later.'
                });
            });

        const modal = bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal'));
        modal.hide();
    });

    

    document.getElementById('confirmReturnOrder').addEventListener('click', function () {
        const orderId = document.getElementById('returnOrderId').value;
        const reason = document.getElementById('orderReturnReason').value;
        const comment = document.getElementById('orderReturnComment').value;

        if (!reason) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Reason',
                text: 'Please select a reason for return'
            });
            return;
        }
        if (reason === 'other' && !comment) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Comment',
                text: 'Please provide a reason for return'
            });
            return;
        }

        fetch('/profile/order/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, reason, comment })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Return Requested',
                        text: 'Your return request was submitted.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to submit return request'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred. Please try again later.'
                });
            });

        const modal = bootstrap.Modal.getInstance(document.getElementById('returnOrderModal'));
        modal.hide();
    });

    async function retryPayment(orderId) {
    try {
        
      const res = await fetch('/user/retry-razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      
      const { razorpayOrderId, amount, key, user } = await res.json();
      
      const options = {
        key,
        amount,
        currency: "INR",
        name: "LapZone",
        description: "Retry Payment",
        order_id: razorpayOrderId,
        handler: async function (response) {
          await fetch('/user/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              orderId
            })
          });

          window.location.href = `/user/order-success/${orderId}`;
        },
        modal: {
          ondismiss: function () {
            window.location.href = `/user/order-failed?orderId=${orderId}`;
          }
        },
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: {
          color: "#3399cc"
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('Retry payment error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Retry Failed',
        text: 'Something went wrong while retrying payment.'
      });
    }
  }

    window.cancelItem = cancelItem;
    window.returnItem = returnItem;
    window.cancelOrder = cancelOrder;
    window.returnOrder = returnOrder;
    window.retryPayment = retryPayment;    

});