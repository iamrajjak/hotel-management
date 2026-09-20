using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Persistence.Repositories;

public class CustomerRepository : Repository<Customer>, ICustomerRepository
{
    public CustomerRepository(ApplicationDbContext db) : base(db)
    {
    }

    public async Task<Customer?> GetByPhoneOrEmailAsync(string phone, string? email)
    {
        var targetPhone = phone.Trim();
        var targetEmail = email?.Trim().ToLower();

        return await Db.Customers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Phone == targetPhone || (!string.IsNullOrEmpty(targetEmail) && c.Email.ToLower() == targetEmail));
    }

    public async Task<List<Customer>> GetCustomersWithStaysAsync()
    {
        return await Db.Customers
            .IgnoreQueryFilters()
            .Include(c => c.Reservations)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
    }
}
