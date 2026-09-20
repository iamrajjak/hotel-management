namespace HotelSaaS.Domain.Entities.Base;

public abstract class BaseEntity
{
    public long trainid { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public abstract class TenantEntity : BaseEntity
{
    public Guid HotelId { get; set; }
    public string HotelCode { get; set; } = string.Empty;
}
