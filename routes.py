from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select

from app.dependencies import CurrentUser, DatabaseSession
from app.models import Post
from app.schemas import PaginatedPosts, PostCreate, PostResponse, PostUpdate

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post(
    "", response_model=PostResponse, status_code=status.HTTP_201_CREATED
)
def create_post(
    post_data: PostCreate, db: DatabaseSession, current_user: CurrentUser
) -> Post:
    post = Post(**post_data.model_dump(), user_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get("", response_model=PaginatedPosts)
def list_posts(
    db: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> dict:
    """List posts with optional full-text search on title and content."""
    base = select(Post)

    if search:
        pattern = f"%{search}%"
        base = base.where(
            or_(
                Post.title.ilike(pattern),
                Post.content.ilike(pattern),
            )
        )

    # Total count (for pagination metadata)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    # Fetch page
    items = list(
        db.scalars(
            base.order_by(Post.created_at.desc()).limit(limit).offset(offset)
        ).all()
    )

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: DatabaseSession) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts",
        )

    for field, value in post_data.model_dump(exclude_unset=True).items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int, db: DatabaseSession, current_user: CurrentUser
) -> Response:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts",
        )

    db.delete(post)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
