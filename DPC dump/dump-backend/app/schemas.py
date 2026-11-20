
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# Registration request
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


# Login request
class UserLogin(BaseModel):
    username: str
    password: str


# User response
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


# Login token response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ==========================================
# FRIENDS & GROUPS SCHEMAS
# ==========================================

# Friend request
class FriendRequestResponse(BaseModel):
    id: int
    requester: UserResponse
    created_at: datetime


# Group creation
class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


# Group update
class GroupUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


# Add member to group
class GroupMemberAdd(BaseModel):
    user_id: int


# Group response
class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_by: int
    created_at: datetime


# Group details with members
class GroupDetailResponse(GroupResponse):
    members: list[UserResponse]