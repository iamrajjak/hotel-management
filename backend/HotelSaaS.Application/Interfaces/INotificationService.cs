using System.Threading.Tasks;
using HotelSaaS.Domain.Entities;

namespace HotelSaaS.Application.Interfaces;

public interface INotificationService
{
    Task SendBookingConfirmationNotificationAsync(Reservation reservation, Hotel hotel, Customer customer);
    Task SendCheckInNotificationAsync(Reservation reservation, Hotel hotel, Customer customer);
    Task SendCheckOutNotificationAsync(Reservation reservation, Hotel hotel, Customer customer);
}
